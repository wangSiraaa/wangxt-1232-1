import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { ExamBatch } from './exam-batch.entity';
import { SealBox } from './seal-box.entity';
import { User } from './user.entity';

@Entity('recovery_records')
export class RecoveryRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: ExamBatch;

  @ManyToOne(() => SealBox)
  @JoinColumn({ name: 'box_id' })
  box: SealBox;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recovered_by' })
  recoveredBy: User;

  @Column({ name: 'recovered_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recoveredAt: Date;

  @Column({ name: 'expected_packages' })
  expectedPackages: number;

  @Column({ name: 'actual_packages' })
  actualPackages: number;

  @Column({ name: 'expected_answer_sheets' })
  expectedAnswerSheets: number;

  @Column({ name: 'actual_answer_sheets' })
  actualAnswerSheets: number;

  @Column({ name: 'count_matched', default: false })
  countMatched: boolean;

  @Column({ default: false })
  archived: boolean;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'archived_by' })
  archivedBy: User;

  @Column({ name: 'blocking_reason', type: 'text', nullable: true })
  blockingReason: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
