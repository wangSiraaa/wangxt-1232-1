import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExceptionRecord } from '@/entities/exception-record.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { ExceptionsService } from './exceptions.service';
import { ExceptionsController } from './exceptions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExceptionRecord, ExamBatch, SealBox, ExamPackage])],
  providers: [ExceptionsService],
  controllers: [ExceptionsController],
  exports: [ExceptionsService],
})
export class ExceptionsModule {}
