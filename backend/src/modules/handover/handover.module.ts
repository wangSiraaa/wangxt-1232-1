import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HandoverRecord } from '@/entities/handover-record.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { HandoverService } from './handover.service';
import { HandoverController } from './handover.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HandoverRecord, SealBox, ExamBatch])],
  providers: [HandoverService],
  controllers: [HandoverController],
  exports: [HandoverService],
})
export class HandoverModule {}
