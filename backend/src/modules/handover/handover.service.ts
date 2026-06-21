import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HandoverRecord, HandoverStatus } from '@/entities/handover-record.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { User, UserRole } from '@/entities/user.entity';
import { EncryptionService } from '@/common/services/encryption.service';

export interface QrCodeDecodedData {
  boxId: string;
  boxNumber: string;
  sealNumber: string;
  batchId: string;
  batchCode: string;
  examSite: string;
  timestamp: number;
}

@Injectable()
export class HandoverService {
  constructor(
    @InjectRepository(HandoverRecord)
    private handoverRepository: Repository<HandoverRecord>,
    @InjectRepository(SealBox)
    private sealBoxesRepository: Repository<SealBox>,
    @InjectRepository(ExamBatch)
    private batchesRepository: Repository<ExamBatch>,
    private encryptionService: EncryptionService,
    private dataSource: DataSource,
  ) {}

  async findAll(boxId?: string, batchId?: string, status?: HandoverStatus): Promise<HandoverRecord[]> {
    const where: any = {};
    if (boxId) where.box = { id: boxId };
    if (batchId) where.batch = { id: batchId };
    if (status) where.status = status;

    return this.handoverRepository.find({
      where,
      relations: ['box', 'batch', 'fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<HandoverRecord> {
    const record = await this.handoverRepository.findOne({
      where: { id },
      relations: ['box', 'batch', 'fromUser', 'toUser'],
    });
    if (!record) {
      throw new NotFoundException('交接记录不存在');
    }
    return record;
  }

  async decodeQrCode(qrData: string): Promise<QrCodeDecodedData> {
    try {
      return this.encryptionService.decryptObject(qrData);
    } catch (error) {
      throw new BadRequestException('二维码无效或已损坏');
    }
  }

  async scanQrCode(qrData: string, user: User): Promise<{
    box: SealBox;
    batch: ExamBatch;
    lastHandover: HandoverRecord;
    canReceive: boolean;
    expectedRole: UserRole;
  }> {
    const decoded = await this.decodeQrCode(qrData);
    const box = await this.sealBoxesRepository.findOne({
      where: { id: decoded.boxId },
      relations: ['batch', 'packages'],
    });

    if (!box) {
      throw new NotFoundException('封签箱不存在');
    }

    const lastHandover = await this.getLastHandover(box.id);
    const expectedRole = this.getExpectedReceiverRole(lastHandover, user.role);

    const canReceive = this.checkCanReceive(lastHandover, user.role);

    return {
      box,
      batch: box.batch,
      lastHandover,
      canReceive,
      expectedRole,
    };
  }

  async createHandover(qrData: string, toUserId: string, arrivalRemark: string, user: User): Promise<HandoverRecord> {
    const decoded = await this.decodeQrCode(qrData);
    const box = await this.sealBoxesRepository.findOne({
      where: { id: decoded.boxId },
      relations: ['batch'],
    });

    if (!box) {
      throw new NotFoundException('封签箱不存在');
    }

    if (!box.isSealed) {
      throw new BadRequestException('该箱尚未封签，不能交接');
    }

    const lastHandover = await this.getLastHandover(box.id);
    if (!this.checkCanInitiate(lastHandover, user.role)) {
      throw new BadRequestException('您无权发起此交接');
    }

    const toUser = await this.sealBoxesRepository.manager.findOne(User, { where: { id: toUserId } });
    if (!toUser) {
      throw new NotFoundException('接收人不存在');
    }

    const expectedRole = this.getExpectedReceiverRole(lastHandover, user.role);
    if (toUser.role !== expectedRole) {
      throw new BadRequestException(`接收人角色必须是${this.getRoleName(expectedRole)}`);
    }

    const handover = this.handoverRepository.create({
      box,
      batch: box.batch,
      fromRole: user.role,
      toRole: toUser.role,
      fromUser: user,
      toUser,
      status: 'pending',
      arrivalRemark: arrivalRemark || null,
    });

    return this.handoverRepository.save(handover);
  }

  async confirmHandover(id: string, sealIntact: boolean, location: string, user: User): Promise<HandoverRecord> {
    const handover = await this.findById(id);

    if (handover.toUser.id !== user.id) {
      throw new BadRequestException('您不是此交接的接收人');
    }

    if (handover.status !== 'pending') {
      throw new BadRequestException('此交接已处理');
    }

    handover.status = 'confirmed';
    handover.sealIntact = sealIntact;
    handover.handoverTime = new Date();
    handover.location = location;

    const savedHandover = await this.handoverRepository.save(handover);

    if (!sealIntact) {
      await this.handleSealDamaged(handover.box.id, user);
    }

    await this.updateBatchStatus(handover.batch.id, user.role);

    return savedHandover;
  }

  async rejectHandover(id: string, remark: string, user: User): Promise<HandoverRecord> {
    const handover = await this.findById(id);

    if (handover.toUser.id !== user.id) {
      throw new BadRequestException('您不是此交接的接收人');
    }

    if (handover.status !== 'pending') {
      throw new BadRequestException('此交接已处理');
    }

    handover.status = 'rejected';
    handover.remark = remark;
    handover.handoverTime = new Date();

    return this.handoverRepository.save(handover);
  }

  private async getLastHandover(boxId: string): Promise<HandoverRecord | null> {
    return this.handoverRepository.findOne({
      where: { box: { id: boxId }, status: 'confirmed' },
      order: { createdAt: 'DESC' },
    });
  }

  private checkCanInitiate(lastHandover: HandoverRecord | null, userRole: UserRole): boolean {
    if (!lastHandover) {
      return userRole === 'printing_factory';
    }
    return lastHandover.toRole === userRole;
  }

  private checkCanReceive(lastHandover: HandoverRecord | null, userRole: UserRole): boolean {
    const expectedRole = this.getExpectedReceiverRole(lastHandover, lastHandover?.toRole || 'printing_factory');
    return userRole === expectedRole;
  }

  private getExpectedReceiverRole(lastHandover: HandoverRecord | null, fromRole: UserRole): UserRole {
    if (!lastHandover) {
      return 'escort';
    }
    const flow: UserRole[] = ['printing_factory', 'escort', 'exam_site_director'];
    const currentIndex = flow.indexOf(fromRole);
    if (currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    throw new BadRequestException('已完成所有交接环节');
  }

  private getRoleName(role: UserRole): string {
    const names: Record<UserRole, string> = {
      proposition_center: '命题中心',
      printing_factory: '印刷厂',
      escort: '押运人员',
      exam_site_director: '考点主任',
      admin: '管理员',
    };
    return names[role];
  }

  private async handleSealDamaged(boxId: string, user: User): Promise<void> {
    const box = await this.sealBoxesRepository.findOne({ where: { id: boxId } });
    if (box) {
      box.sealIntact = false;
      await this.sealBoxesRepository.save(box);
    }

    const batch = await this.batchesRepository.findOne({ where: { id: box.batch.id } });
    if (batch) {
      batch.status = 'exception';
      await this.batchesRepository.save(batch);
    }
  }

  private async updateBatchStatus(batchId: string, userRole: UserRole): Promise<void> {
    const batch = await this.batchesRepository.findOne({ where: { id: batchId } });
    if (!batch) return;

    if (userRole === 'escort') {
      batch.status = 'in_transit';
    } else if (userRole === 'exam_site_director') {
      batch.status = 'delivered';
    }
    await this.batchesRepository.save(batch);
  }
}
