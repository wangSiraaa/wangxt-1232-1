import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SealBox } from '@/entities/seal-box.entity';
import { ExamBatch } from '@/entities/exam-batch.entity';
import { ExamPackage } from '@/entities/exam-package.entity';
import { SealBoxesService } from './seal-boxes.service';
import { SealBoxesController } from './seal-boxes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SealBox, ExamBatch, ExamPackage])],
  providers: [SealBoxesService],
  controllers: [SealBoxesController],
  exports: [SealBoxesService],
})
export class SealBoxesModule {}
