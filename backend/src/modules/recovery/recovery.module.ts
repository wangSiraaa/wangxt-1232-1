import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecoveryRecord } from '@/entities/recovery-record.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { RecoveryService } from './recovery.service';
import { RecoveryController } from './recovery.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RecoveryRecord, ExamBatch, SealBox, ExamPackage])],
  providers: [RecoveryService],
  controllers: [RecoveryController],
  exports: [RecoveryService],
})
export class RecoveryModule {}
