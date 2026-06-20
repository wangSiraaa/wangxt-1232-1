import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RecoveryRecord } from '@/entities/recovery-record.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { User } from '@/entities/user.entity';

@Injectable()
export class RecoveryService {
  constructor(
    @InjectRepository(RecoveryRecord)
    private recoveryRepository: Repository<RecoveryRecord>,
    @InjectRepository(ExamBatch)
    private batchesRepository: Repository<ExamBatch>,
    @InjectRepository(SealBox)
    private sealBoxesRepository: Repository<SealBox>,
    @InjectRepository(ExamPackage)
    private packagesRepository: Repository<ExamPackage>,
    private dataSource: DataSource,
  ) {}

  async findAll(batchId?: string, archived?: boolean): Promise<RecoveryRecord[]> {
    const where: any = {};
    if (batchId) where.batch = { id: batchId };
    if (archived !== undefined) where.archived = archived;

    return this.recoveryRepository.find({
      where,
      relations: ['batch', 'box', 'recoveredBy', 'archivedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<RecoveryRecord> {
    const record = await this.recoveryRepository.findOne({
      where: { id },
      relations: ['batch', 'box', 'recoveredBy', 'archivedBy'],
    });
    if (!record) {
      throw new NotFoundException('回收记录不存在');
    }
    return record;
  }

  async getRecoveryInfo(batchId: string): Promise<{
    batch: ExamBatch;
    expectedPackages: number;
    expectedAnswerSheets: number;
    recoveredPackages: number;
    recoveredAnswerSheets: number;
    packages: ExamPackage[];
  }> {
    const batch = await this.batchesRepository.findOne({
      where: { id: batchId },
      relations: ['packages', 'sealBoxes'],
    });

    if (!batch) {
      throw new NotFoundException('批次不存在');
    }

    const expectedPackages = batch.totalPackages;
    const expectedAnswerSheets = batch.packages.reduce((sum, pkg) => sum + pkg.candidateCount, 0);
    const recoveredPackages = batch.packages.filter(pkg => pkg.isRecycled).length;
    const recoveredAnswerSheets = batch.packages.filter(pkg => pkg.isRecycled).reduce((sum, pkg) => sum + (pkg.answerSheetsReturned || 0), 0);

    return {
      batch,
      expectedPackages,
      expectedAnswerSheets,
      recoveredPackages,
      recoveredAnswerSheets,
      packages: batch.packages,
    };
  }

  async submitRecovery(
    batchId: string,
    boxId: string | null,
    packageData: { packageId: string; answerSheetsReturned: number }[],
    user: User,
  ): Promise<RecoveryRecord> {
    const batch = await this.batchesRepository.findOne({
      where: { id: batchId },
      relations: ['packages'],
    });

    if (!batch) {
      throw new NotFoundException('批次不存在');
    }

    if (batch.status !== 'opened') {
      throw new BadRequestException('该批次尚未启封，无法回收');
    }

    let box: SealBox | null = null;
    if (boxId) {
      box = await this.sealBoxesRepository.findOne({ where: { id: boxId } });
      if (!box) {
        throw new NotFoundException('封签箱不存在');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expectedPackages = box
        ? box.packageCount
        : batch.totalPackages;
      const actualPackages = packageData.length;

      let expectedAnswerSheets = 0;
      let actualAnswerSheets = 0;

      for (const data of packageData) {
        const pkg = await queryRunner.manager.findOne(ExamPackage, {
          where: { id: data.packageId },
        });
        if (!pkg) {
          throw new NotFoundException(`试卷包 ${data.packageId} 不存在`);
        }

        expectedAnswerSheets += pkg.candidateCount;
        actualAnswerSheets += data.answerSheetsReturned;

        pkg.answerSheetsReturned = data.answerSheetsReturned;
        pkg.isRecycled = true;
        pkg.recycledAt = new Date();
        pkg.recycledBy = user;
        await queryRunner.manager.save(pkg);
      }

      const countMatched = expectedPackages === actualPackages && expectedAnswerSheets === actualAnswerSheets;

      let blockingReason: string | null = null;
      if (!countMatched) {
        const reasons: string[] = [];
        if (expectedPackages !== actualPackages) {
          reasons.push(`试卷包数量不符：应回收 ${expectedPackages} 包，实际回收 ${actualPackages} 包`);
        }
        if (expectedAnswerSheets !== actualAnswerSheets) {
          reasons.push(`答题卡数量不符：应回收 ${expectedAnswerSheets} 份，实际回收 ${actualAnswerSheets} 份`);
        }
        blockingReason = reasons.join('；');
      }

      const recoveryRecord = queryRunner.manager.create(RecoveryRecord, {
        batch,
        box: box || undefined,
        recoveredBy: user,
        expectedPackages,
        actualPackages,
        expectedAnswerSheets,
        actualAnswerSheets,
        countMatched,
        blockingReason,
      });

      const savedRecord = await queryRunner.manager.save(recoveryRecord);

      batch.status = 'recycling';
      await queryRunner.manager.save(batch);

      await queryRunner.commitTransaction();
      return this.findById(savedRecord.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async archive(id: string, user: User, force = false): Promise<RecoveryRecord> {
    const record = await this.findById(id);

    if (record.archived) {
      throw new BadRequestException('该回收记录已归档');
    }

    if (!record.countMatched && !force) {
      throw new BadRequestException(`数量不匹配，无法归档：${record.blockingReason}`);
    }

    if (record.countMatched || force) {
      record.archived = true;
      record.archivedAt = new Date();
      record.archivedBy = user;
    }

    const savedRecord = await this.recoveryRepository.save(record);

    const allArchived = await this.checkAllArchived(record.batch.id);
    if (allArchived) {
      record.batch.status = 'archived';
      await this.batchesRepository.save(record.batch);
    }

    return savedRecord;
  }

  private async checkAllArchived(batchId: string): Promise<boolean> {
    const records = await this.recoveryRepository.find({
      where: { batch: { id: batchId } },
    });
    return records.length > 0 && records.every(r => r.archived);
  }
}
