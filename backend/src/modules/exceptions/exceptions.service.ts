import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExceptionRecord, ExceptionType, ExceptionStatus } from '@/entities/exception-record.entity';
import { User } from '@/entities/user.entity';
import { ExamBatch, BatchStatus } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';

@Injectable()
export class ExceptionsService {
  constructor(
    @InjectRepository(ExceptionRecord)
    private exceptionsRepository: Repository<ExceptionRecord>,
    @InjectRepository(ExamBatch)
    private batchesRepository: Repository<ExamBatch>,
    @InjectRepository(SealBox)
    private sealBoxesRepository: Repository<SealBox>,
    @InjectRepository(ExamPackage)
    private packagesRepository: Repository<ExamPackage>,
  ) {}

  async findAll(
    batchId?: string,
    exceptionType?: ExceptionType,
    exceptionStatus?: ExceptionStatus,
  ): Promise<ExceptionRecord[]> {
    const where: any = {};
    if (batchId) where.batch = { id: batchId };
    if (exceptionType) where.exceptionType = exceptionType;
    if (exceptionStatus) where.exceptionStatus = exceptionStatus;

    return this.exceptionsRepository.find({
      where,
      relations: ['batch', 'box', 'package', 'reportedBy', 'resolvedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ExceptionRecord> {
    const record = await this.exceptionsRepository.findOne({
      where: { id },
      relations: ['batch', 'box', 'package', 'reportedBy', 'resolvedBy'],
    });
    if (!record) {
      throw new NotFoundException('异常记录不存在');
    }
    return record;
  }

  async report(exceptionData: {
    batchId: string;
    boxId?: string;
    packageId?: string;
    exceptionType: ExceptionType;
    description: string;
    location?: string;
    witnesses?: string[];
  }, user: User): Promise<ExceptionRecord> {
    const batch = await this.batchesRepository.findOne({ where: { id: exceptionData.batchId } });
    if (!batch) {
      throw new NotFoundException('批次不存在');
    }

    let box: SealBox | null = null;
    if (exceptionData.boxId) {
      box = await this.sealBoxesRepository.findOne({ where: { id: exceptionData.boxId } });
      if (!box) {
        throw new NotFoundException('封签箱不存在');
      }
    }

    let pkg: ExamPackage | null = null;
    if (exceptionData.packageId) {
      pkg = await this.packagesRepository.findOne({ where: { id: exceptionData.packageId } });
      if (!pkg) {
        throw new NotFoundException('试卷包不存在');
      }
    }

    if (exceptionData.exceptionType === 'seal_damaged' && box) {
      box.sealIntact = false;
      await this.sealBoxesRepository.save(box);
    }

    batch.status = 'exception';
    await this.batchesRepository.save(batch);

    const exception = this.exceptionsRepository.create({
      batch,
      box: box || undefined,
      package: pkg || undefined,
      exceptionType: exceptionData.exceptionType,
      reportedBy: user,
      description: exceptionData.description,
      location: exceptionData.location,
      witnesses: exceptionData.witnesses,
    });

    return this.exceptionsRepository.save(exception);
  }

  async updateStatus(
    id: string,
    status: ExceptionStatus,
    investigationResult?: string,
    resolution?: string,
    user?: User,
  ): Promise<ExceptionRecord> {
    const exception = await this.findById(id);

    exception.exceptionStatus = status;
    if (investigationResult) {
      exception.investigationResult = investigationResult;
    }
    if (resolution) {
      exception.resolution = resolution;
    }
    if (status === 'resolved' || status === 'closed') {
      exception.resolvedAt = new Date();
      exception.resolvedBy = user;

      const hasOtherExceptions = await this.hasOtherActiveExceptions(exception.batch.id);
      if (!hasOtherExceptions) {
        exception.batch.status = this.getNextBatchStatus(exception.batch);
        await this.batchesRepository.save(exception.batch);
      }
    }

    return this.exceptionsRepository.save(exception);
  }

  async update(id: string, data: Partial<ExceptionRecord>): Promise<ExceptionRecord> {
    const exception = await this.findById(id);
    Object.assign(exception, data);
    return this.exceptionsRepository.save(exception);
  }

  private async hasOtherActiveExceptions(batchId: string): Promise<boolean> {
    const count = await this.exceptionsRepository.count({
      where: {
        batch: { id: batchId },
        exceptionStatus: { $in: ['reported', 'investigating'] } as any,
      },
    });
    return count > 1;
  }

  private getNextBatchStatus(batch: ExamBatch): BatchStatus {
    if (batch.status === 'exception') {
      return 'in_transit';
    }
    return batch.status;
  }
}
