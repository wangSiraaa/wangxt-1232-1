import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UnsealRecord } from '@/entities/unseal-record.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { User } from '@/entities/user.entity';
import { TimeValidatorService } from '@/common/services/time-validator.service';
import { EncryptionService } from '@/common/services/encryption.service';

@Injectable()
export class UnsealService {
  constructor(
    @InjectRepository(UnsealRecord)
    private unsealRepository: Repository<UnsealRecord>,
    @InjectRepository(ExamBatch)
    private batchesRepository: Repository<ExamBatch>,
    @InjectRepository(SealBox)
    private sealBoxesRepository: Repository<SealBox>,
    @InjectRepository(ExamPackage)
    private packagesRepository: Repository<ExamPackage>,
    private timeValidatorService: TimeValidatorService,
    private encryptionService: EncryptionService,
    private dataSource: DataSource,
  ) {}

  async findAll(batchId?: string, boxId?: string, packageId?: string): Promise<UnsealRecord[]> {
    const where: any = {};
    if (batchId) where.batch = { id: batchId };
    if (boxId) where.box = { id: boxId };
    if (packageId) where.package = { id: packageId };

    return this.unsealRepository.find({
      where,
      relations: ['batch', 'box', 'package', 'unsealedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<UnsealRecord> {
    const record = await this.unsealRepository.findOne({
      where: { id },
      relations: ['batch', 'box', 'package', 'unsealedBy'],
    });
    if (!record) {
      throw new NotFoundException('启封记录不存在');
    }
    return record;
  }

  async getBoxInfoForUnseal(qrData: string, user: User): Promise<{
    box: SealBox;
    batch: ExamBatch;
    canUnseal: boolean;
    unsealTime: Date;
    timeRemaining: string;
    hasException: boolean;
  }> {
    const decoded = await this.encryptionService.decryptObject(qrData);
    const box = await this.sealBoxesRepository.findOne({
      where: { id: decoded.boxId },
      relations: ['batch', 'packages'],
    });

    if (!box) {
      throw new NotFoundException('封签箱不存在');
    }

    const batch = box.batch;
    const now = new Date();
    const canUnseal = this.timeValidatorService.isAfterUnsealTime(batch.unsealTime);

    let timeRemaining = '已到启封时间';
    if (!canUnseal) {
      const diffMs = batch.unsealTime.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      timeRemaining = `还需等待 ${diffHours} 小时 ${diffMinutes} 分钟`;
    }

    const hasException = !box.sealIntact;

    return {
      box,
      batch,
      canUnseal,
      unsealTime: batch.unsealTime,
      timeRemaining,
      hasException,
    };
  }

  async getPackageInfo(packageId: string, user: User): Promise<{
    package: ExamPackage;
    batch: ExamBatch;
    canView: boolean;
    unsealTime: Date;
  }> {
    const pkg = await this.packagesRepository.findOne({
      where: { id: packageId },
      relations: ['batch', 'box'],
    });

    if (!pkg) {
      throw new NotFoundException('试卷包不存在');
    }

    const canView = this.timeValidatorService.isAfterUnsealTime(pkg.batch.unsealTime);

    if (!canView) {
      throw new ForbiddenException(
        `未到启封时间，请在 ${this.timeValidatorService.formatTime(pkg.batch.unsealTime)} 后查看`,
      );
    }

    return {
      package: pkg,
      batch: pkg.batch,
      canView: true,
      unsealTime: pkg.batch.unsealTime,
    };
  }

  async unsealBox(
    boxId: string,
    sealIntact: boolean,
    witnesses: string[],
    remark?: string,
    user?: User,
  ): Promise<UnsealRecord> {
    const box = await this.sealBoxesRepository.findOne({
      where: { id: boxId },
      relations: ['batch'],
    });

    if (!box) {
      throw new NotFoundException('封签箱不存在');
    }

    const batch = box.batch;

    this.timeValidatorService.validateUnsealTime(batch.unsealTime);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const packages = await queryRunner.manager.find(ExamPackage, {
        where: { box: { id: boxId } },
        relations: ['batch'],
      });

      let exceptionReported = false;
      if (!sealIntact) {
        exceptionReported = true;
        box.sealIntact = false;
        await queryRunner.manager.save(box);
      }

      const unsealRecord = queryRunner.manager.create(UnsealRecord, {
        batch,
        box,
        unsealedBy: user,
        examSite: box.examSite,
        witnesses,
        sealIntact,
        exceptionReported,
        remark,
      });

      const savedRecord = await queryRunner.manager.save(unsealRecord);

      for (const pkg of packages) {
        pkg.isOpened = true;
        pkg.openedAt = new Date();
        pkg.openedBy = user;
        await queryRunner.manager.save(pkg);
      }

      batch.status = 'opened';
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

  async unsealPackage(
    packageId: string,
    sealIntact: boolean,
    witnesses: string[],
    remark?: string,
    user?: User,
  ): Promise<UnsealRecord> {
    const pkg = await this.packagesRepository.findOne({
      where: { id: packageId },
      relations: ['batch', 'box'],
    });

    if (!pkg) {
      throw new NotFoundException('试卷包不存在');
    }

    const batch = pkg.batch;
    this.timeValidatorService.validateUnsealTime(batch.unsealTime);

    if (pkg.isOpened) {
      throw new BadRequestException('该试卷包已启封');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let exceptionReported = false;
      if (!sealIntact) {
        exceptionReported = true;
        if (pkg.box) {
          pkg.box.sealIntact = false;
          await queryRunner.manager.save(pkg.box);
        }
      }

      const unsealRecord = queryRunner.manager.create(UnsealRecord, {
        batch,
        box: pkg.box || undefined,
        package: pkg,
        unsealedBy: user,
        examSite: pkg.examSite,
        witnesses,
        sealIntact,
        exceptionReported,
        remark,
      });

      const savedRecord = await queryRunner.manager.save(unsealRecord);

      pkg.isOpened = true;
      pkg.openedAt = new Date();
      pkg.openedBy = user;
      await queryRunner.manager.save(pkg);

      const allBoxesOpened = await this.checkAllBoxesOpened(batch.id);
      if (allBoxesOpened) {
        batch.status = 'opened';
        await queryRunner.manager.save(batch);
      }

      await queryRunner.commitTransaction();
      return this.findById(savedRecord.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async checkAllBoxesOpened(batchId: string): Promise<boolean> {
    const boxes = await this.sealBoxesRepository.find({
      where: { batch: { id: batchId } },
      relations: ['packages'],
    });

    return boxes.every(box =>
      box.packages.every(pkg => pkg.isOpened)
    );
  }
}
