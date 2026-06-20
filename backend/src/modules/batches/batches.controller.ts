import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BatchesService } from './batches.service';
import { ExamBatch, BatchStatus } from '@/entities/exam-batch.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/entities/user.entity';

@ApiTags('批次管理')
@ApiBearerAuth()
@Controller('batches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  findAll(@Query('status') status?: BatchStatus): Promise<ExamBatch[]> {
    return this.batchesService.findAll(status);
  }

  @Get('statistics')
  getStatistics(): Promise<{
    total: number;
    byStatus: Record<BatchStatus, number>;
    today: number;
  }> {
    return this.batchesService.getStatistics();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ExamBatch> {
    return this.batchesService.findById(id);
  }

  @Post()
  @Roles('proposition_center', 'admin')
  create(
    @Body() batchData: {
      examName: string;
      examSubject: string;
      examDate: Date;
      unsealTime: Date;
      examStartTime: Date;
      examEndTime: Date;
      totalPackages: number;
      totalBoxes: number;
      remark?: string;
    },
    @Request() req,
  ): Promise<ExamBatch> {
    return this.batchesService.create(batchData, req.user as User);
  }

  @Put(':id')
  @Roles('proposition_center', 'admin')
  update(@Param('id') id: string, @Body() batchData: Partial<ExamBatch>): Promise<ExamBatch> {
    return this.batchesService.update(id, batchData);
  }

  @Put(':id/status')
  @Roles('proposition_center', 'admin')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: BatchStatus },
    @Request() req,
  ): Promise<ExamBatch> {
    return this.batchesService.updateStatus(id, body.status, req.user as User);
  }

  @Delete(':id')
  @Roles('proposition_center', 'admin')
  remove(@Param('id') id: string): Promise<void> {
    return this.batchesService.remove(id);
  }
}
