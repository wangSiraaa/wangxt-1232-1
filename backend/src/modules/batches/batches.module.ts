import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExamBatch, SealBox, ExamPackage])],
  providers: [BatchesService],
  controllers: [BatchesController],
  exports: [BatchesService],
})
export class BatchesModule {}
