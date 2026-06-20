import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { User } from '@/entities/user.entity';
import { QrCodeService } from '@/common/services/qrcode.service';
import { EncryptionService } from '@/common/services/encryption.service';

@Injectable()
export class SealBoxesService {
  constructor(
    @InjectRepository(SealBox)
    private sealBoxesRepository: Repository<SealBox>,
    @InjectRepository(ExamBatch)
    private batchesRepository: Repository<ExamBatch>,
    @InjectRepository(ExamPackage)
    private packagesRepository: Repository<ExamPackage>,
    private qrCodeService: QrCodeService,
    private encryptionService: EncryptionService,
    private dataSource: DataSource,
  ) {}

  async findAll(batchId?: string, examSite?: string): Promise<SealBox[]> {
    const where: any = {};
    if (batchId) where.batch = { id: batchId };
    if (examSite) where.examSite = examSite;

    return this.sealBoxesRepository.find({
      where,
      relations: ['batch', 'sealedBy', 'packages'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<SealBox> {
    const box = await this.sealBoxesRepository.findOne({
      where: { id },
      relations: ['batch', 'sealedBy', 'packages'],
    });
    if (!box) {
      throw new NotFoundException('封签箱不存在');
    }
    return box;
  }

  async findByBoxNumber(boxNumber: string): Promise<SealBox> {
    const box = await this.sealBoxesRepository.findOne({
      where: { boxNumber },
      relations: ['batch', 'sealedBy', 'packages'],
    });
    if (!box) {
      throw new NotFoundException('封签箱不存在');
    }
    return box;
  }

  async register(boxData: {
    batchId: string;
    boxNumber: string;
    sealNumber: string;
    packageCount: number;
    packageStartNumber: number;
    packageEndNumber: number;
    examSite: string;
  }, user: User): Promise<SealBox> {
    const batch = await this.batchesRepository.findOne({ where: { id: boxData.batchId } });
    if (!batch) {
      throw new NotFoundException('批次不存在');
    }

    if (batch.status !== 'created' && batch.status !== 'printing') {
      throw new BadRequestException('该批次状态不允许登记封签箱');
    }

    const existingBox = await this.sealBoxesRepository.findOne({ where: { boxNumber: boxData.boxNumber } });
    if (existingBox) {
      throw new BadRequestException('箱号已存在');
    }

    const existingSeal = await this.sealBoxesRepository.findOne({ where: { sealNumber: boxData.sealNumber } });
    if (existingSeal) {
      throw new BadRequestException('封签号已存在');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const box = this.sealBoxesRepository.create({
        ...boxData,
        batch,
      });

      const savedBox = await queryRunner.manager.save(box);

      for (let i = boxData.packageStartNumber; i <= boxData.packageEndNumber; i++) {
        const pkg = this.packagesRepository.create({
          batch,
          box: savedBox,
          packageNumber: `${batch.batchCode}-P${String(i).padStart(4, '0')}`,
          examSite: boxData.examSite,
          candidateCount: 30,
        });
        await queryRunner.manager.save(pkg);
      }

      const qrData = this.encryptionService.encryptObject({
        boxId: savedBox.id,
        boxNumber: savedBox.boxNumber,
        sealNumber: savedBox.sealNumber,
        batchId: batch.id,
        batchCode: batch.batchCode,
        examSite: savedBox.examSite,
        timestamp: Date.now(),
      });

      savedBox.qrCode = await this.qrCodeService.generate(qrData);
      await queryRunner.manager.save(savedBox);

      batch.status = 'printing';
      await queryRunner.manager.save(batch);

      await queryRunner.commitTransaction();
      return this.findById(savedBox.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async seal(id: string, user: User): Promise<SealBox> {
    const box = await this.findById(id);

    if (box.isSealed) {
      throw new BadRequestException('该箱已封签');
    }

    box.isSealed = true;
    box.sealedAt = new Date();
    box.sealedBy = user;

    const savedBox = await this.sealBoxesRepository.save(box);

    const allBoxesSealed = await this.checkAllBoxesSealed(box.batch.id);
    if (allBoxesSealed) {
      box.batch.status = 'sealed';
      await this.batchesRepository.save(box.batch);
    }

    return savedBox;
  }

  async markSealDamaged(id: string): Promise<SealBox> {
    const box = await this.findById(id);
    box.sealIntact = false;
    return this.sealBoxesRepository.save(box);
  }

  async updateSealStatus(id: string, intact: boolean): Promise<SealBox> {
    const box = await this.findById(id);
    box.sealIntact = intact;
    return this.sealBoxesRepository.save(box);
  }

  private async checkAllBoxesSealed(batchId: string): Promise<boolean> {
    const boxes = await this.sealBoxesRepository.find({ where: { batch: { id: batchId } } });
    return boxes.length > 0 && boxes.every(box => box.isSealed);
  }
}
