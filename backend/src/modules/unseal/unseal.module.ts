import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnsealRecord } from '@/entities/unseal-record.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { UnsealService } from './unseal.service';
import { UnsealController } from './unseal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UnsealRecord, ExamBatch, SealBox, ExamPackage])],
  providers: [UnsealService],
  controllers: [UnsealController],
  exports: [UnsealService],
})
export class UnsealModule {}
