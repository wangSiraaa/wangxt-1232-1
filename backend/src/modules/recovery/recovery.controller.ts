import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RecoveryService } from './recovery.service';
import { RecoveryRecord } from '@/entities/recovery-record.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/entities/user.entity';

@ApiTags('回收归档')
@ApiBearerAuth()
@Controller('recovery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get()
  findAll(
    @Query('batchId') batchId?: string,
    @Query('archived') archived?: boolean,
  ): Promise<RecoveryRecord[]> {
    return this.recoveryService.findAll(batchId, archived);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<RecoveryRecord> {
    return this.recoveryService.findById(id);
  }

  @Get('batch/:batchId/info')
  @Roles('exam_site_director', 'proposition_center', 'admin')
  getRecoveryInfo(
    @Param('batchId') batchId: string,
  ): Promise<{
    batch: ExamBatch;
    expectedPackages: number;
    expectedAnswerSheets: number;
    recoveredPackages: number;
    recoveredAnswerSheets: number;
    packages: ExamPackage[];
  }> {
    return this.recoveryService.getRecoveryInfo(batchId);
  }

  @Post()
  @Roles('exam_site_director', 'admin')
  submitRecovery(
    @Body() body: {
      batchId: string;
      boxId?: string;
      packageData: { packageId: string; answerSheetsReturned: number }[];
    },
    @Request() req,
  ): Promise<RecoveryRecord> {
    return this.recoveryService.submitRecovery(
      body.batchId,
      body.boxId || null,
      body.packageData,
      req.user as User,
    );
  }

  @Put(':id/archive')
  @Roles('proposition_center', 'admin')
  archive(
    @Param('id') id: string,
    @Query('force') force?: boolean,
    @Request() req?,
  ): Promise<RecoveryRecord> {
    return this.recoveryService.archive(id, req.user as User, force === true || force === false ? force : false);
  }
}
