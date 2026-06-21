import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HandoverService } from './handover.service';
import { HandoverRecord, HandoverStatus } from '@/entities/handover-record.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { UserRole } from '@/entities/user.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/entities/user.entity';

@ApiTags('交接管理')
@ApiBearerAuth()
@Controller('handover')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HandoverController {
  constructor(private readonly handoverService: HandoverService) {}

  @Get()
  findAll(
    @Query('boxId') boxId?: string,
    @Query('batchId') batchId?: string,
    @Query('status') status?: HandoverStatus,
  ): Promise<HandoverRecord[]> {
    return this.handoverService.findAll(boxId, batchId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<HandoverRecord> {
    return this.handoverService.findById(id);
  }

  @Post('scan')
  @Roles('printing_factory', 'escort', 'exam_site_director', 'admin')
  scanQrCode(
    @Body() body: { qrData: string },
    @Request() req,
  ): Promise<{
    box: SealBox;
    batch: ExamBatch;
    lastHandover: HandoverRecord;
    canReceive: boolean;
    expectedRole: UserRole;
  }> {
    return this.handoverService.scanQrCode(body.qrData, req.user as User);
  }

  @Post('decode')
  @Roles('printing_factory', 'escort', 'exam_site_director', 'admin')
  decodeQrCode(@Body() body: { qrData: string }) {
    return this.handoverService.decodeQrCode(body.qrData);
  }

  @Post()
  @Roles('printing_factory', 'escort', 'admin')
  createHandover(
    @Body() body: { qrData: string; toUserId: string; arrivalRemark?: string },
    @Request() req,
  ): Promise<HandoverRecord> {
    return this.handoverService.createHandover(body.qrData, body.toUserId, body.arrivalRemark || '', req.user as User);
  }

  @Put(':id/confirm')
  @Roles('escort', 'exam_site_director', 'admin')
  confirmHandover(
    @Param('id') id: string,
    @Body() body: { sealIntact: boolean; location: string },
    @Request() req,
  ): Promise<HandoverRecord> {
    return this.handoverService.confirmHandover(id, body.sealIntact, body.location, req.user as User);
  }

  @Put(':id/reject')
  @Roles('escort', 'exam_site_director', 'admin')
  rejectHandover(
    @Param('id') id: string,
    @Body() body: { remark: string },
    @Request() req,
  ): Promise<HandoverRecord> {
    return this.handoverService.rejectHandover(id, body.remark, req.user as User);
  }
}
