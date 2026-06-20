import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UnsealService } from './unseal.service';
import { UnsealRecord } from '@/entities/unseal-record.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/entities/user.entity';

@ApiTags('启封管理')
@ApiBearerAuth()
@Controller('unseal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnsealController {
  constructor(private readonly unsealService: UnsealService) {}

  @Get()
  findAll(
    @Query('batchId') batchId?: string,
    @Query('boxId') boxId?: string,
    @Query('packageId') packageId?: string,
  ): Promise<UnsealRecord[]> {
    return this.unsealService.findAll(batchId, boxId, packageId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<UnsealRecord> {
    return this.unsealService.findById(id);
  }

  @Post('scan')
  @Roles('exam_site_director', 'admin')
  getBoxInfoForUnseal(
    @Body() body: { qrData: string },
    @Request() req,
  ): Promise<{
    box: SealBox;
    batch: ExamBatch;
    canUnseal: boolean;
    unsealTime: Date;
    timeRemaining: string;
    hasException: boolean;
  }> {
    return this.unsealService.getBoxInfoForUnseal(body.qrData, req.user as User);
  }

  @Get('package/:packageId')
  @Roles('exam_site_director', 'admin')
  getPackageInfo(
    @Param('packageId') packageId: string,
    @Request() req,
  ): Promise<{
    package: ExamPackage;
    batch: ExamBatch;
    canView: boolean;
    unsealTime: Date;
  }> {
    return this.unsealService.getPackageInfo(packageId, req.user as User);
  }

  @Post('box/:boxId')
  @Roles('exam_site_director', 'admin')
  unsealBox(
    @Param('boxId') boxId: string,
    @Body() body: {
      sealIntact: boolean;
      witnesses: string[];
      remark?: string;
    },
    @Request() req,
  ): Promise<UnsealRecord> {
    return this.unsealService.unsealBox(
      boxId,
      body.sealIntact,
      body.witnesses,
      body.remark,
      req.user as User,
    );
  }

  @Post('package/:packageId')
  @Roles('exam_site_director', 'admin')
  unsealPackage(
    @Param('packageId') packageId: string,
    @Body() body: {
      sealIntact: boolean;
      witnesses: string[];
      remark?: string;
    },
    @Request() req,
  ): Promise<UnsealRecord> {
    return this.unsealService.unsealPackage(
      packageId,
      body.sealIntact,
      body.witnesses,
      body.remark,
      req.user as User,
    );
  }
}
