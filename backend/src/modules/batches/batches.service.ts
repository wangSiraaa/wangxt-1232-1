import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ExamBatch, BatchStatus } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { User } from '@/entities/user.entity';
import * as dayjs from 'dayjs';

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(ExamBatch)
    private batchesRepository: Repository<ExamBatch>,
    @InjectRepository(SealBox)
    private sealBoxesRepository: Repository<SealBox>,
    @InjectRepository(ExamPackage)
    private packagesRepository: Repository<ExamPackage>,
    private dataSource: DataSource,
  ) {}

  async findAll(status?: BatchStatus): Promise<ExamBatch[]> {
    const where = status ? { status } : {};
    return this.batchesRepository.find({
      where,
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ExamBatch> {
    const batch = await this.batchesRepository.findOne({
      where: { id },
      relations: ['createdBy', 'sealBoxes', 'packages'],
    });
    if (!batch) {
      throw new NotFoundException('批次不存在');
    }
    return batch;
  }

  async create(batchData: {
    examName: string;
    examSubject: string;
    examDate: Date;
    unsealTime: Date;
    examStartTime: Date;
    examEndTime: Date;
    totalPackages: number;
    totalBoxes: number;
    remark?: string;
  }, user: User): Promise<ExamBatch> {
    const batchCode = this.generateBatchCode(batchData.examDate);

    const existing = await this.batchesRepository.findOne({ where: { batchCode } });
    if (existing) {
      throw new BadRequestException('批次编码已存在');
    }

    const batch = this.batchesRepository.create({
      ...batchData,
      batchCode,
      createdBy: user,
      status: 'created',
    });

    return this.batchesRepository.save(batch);
  }

  async update(id: string, batchData: Partial<ExamBatch>): Promise<ExamBatch> {
    const batch = await this.findById(id);
    
    if (batch.status !== 'created') {
      throw new BadRequestException('只能修改状态为"已创建"的批次');
    }

    Object.assign(batch, batchData);
    return this.batchesRepository.save(batch);
  }

  async updateStatus(id: string, status: BatchStatus, user: User): Promise<ExamBatch> {
    const batch = await this.findById(id);
    batch.status = status;
    return this.batchesRepository.save(batch);
  }

  async remove(id: string): Promise<void> {
    const batch = await this.findById(id);
    
    if (batch.status !== 'created') {
      throw new BadRequestException('只能删除状态为"已创建"的批次');
    }

    await this.batchesRepository.remove(batch);
  }

  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<BatchStatus, number>;
    today: number;
  }> {
    const total = await this.batchesRepository.count();
    const today = await this.batchesRepository.count({
      where: {
        examDate: dayjs().format('YYYY-MM-DD') as any,
      },
    });

    const statuses: BatchStatus[] = ['created', 'printing', 'sealed', 'in_transit', 'delivered', 'opened', 'recycling', 'archived', 'exception'];
    const byStatus = {} as Record<BatchStatus, number>;

    for (const status of statuses) {
      byStatus[status] = await this.batchesRepository.count({ where: { status } });
    }

    return { total, byStatus, today };
  }

  private generateBatchCode(examDate: Date): string {
    const dateStr = dayjs(examDate).format('YYYYMMDD');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BATCH-${dateStr}-${random}`;
  }
}
