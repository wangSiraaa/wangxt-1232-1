import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { ExamBatch } from './exam-batch.entity';
import { SealBox } from './seal-box.entity';
import { ExamPackage } from './exam-package.entity';
import { User } from './user.entity';

export type ExceptionType = 'seal_damaged' | 'package_missing' | 'count_mismatch' | 'time_violation' | 'other';
export type ExceptionStatus = 'reported' | 'investigating' | 'resolved' | 'closed';

@Entity('exception_records')
export class ExceptionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: ExamBatch;

  @ManyToOne(() => SealBox)
  @JoinColumn({ name: 'box_id' })
  box: SealBox;

  @ManyToOne(() => ExamPackage)
  @JoinColumn({ name: 'package_id' })
  package: ExamPackage;

  @Column({ name: 'exception_type', type: 'enum', enum: ['seal_damaged', 'package_missing', 'count_mismatch', 'time_violation', 'other'] })
  exceptionType: ExceptionType;

  @Column({ name: 'exception_status', type: 'enum', enum: ['reported', 'investigating', 'resolved', 'closed'], default: 'reported' })
  exceptionStatus: ExceptionStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_by' })
  reportedBy: User;

  @Column({ name: 'reported_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  reportedAt: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 200, nullable: true })
  location: string;

  @Column({ name: 'investigation_result', type: 'text', nullable: true })
  investigationResult: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy: User;

  @Column({ name: 'related_photos', type: 'text', array: true, nullable: true })
  relatedPhotos: string[];

  @Column({ type: 'text', array: true, nullable: true })
  witnesses: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
