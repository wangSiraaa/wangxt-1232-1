import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { ExamBatch } from './exam-batch.entity';
import { SealBox } from './seal-box.entity';
import { User } from './user.entity';

@Entity('exam_packages')
export class ExamPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamBatch, batch => batch.packages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: ExamBatch;

  @ManyToOne(() => SealBox, box => box.packages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'box_id' })
  box: SealBox;

  @Column({ name: 'package_number', unique: true, length: 50 })
  packageNumber: string;

  @Column({ name: 'exam_site', length: 200 })
  examSite: string;

  @Column({ name: 'candidate_count' })
  candidateCount: number;

  @Column({ name: 'is_opened', default: false })
  isOpened: boolean;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by' })
  openedBy: User;

  @Column({ name: 'answer_sheets_returned', nullable: true })
  answerSheetsReturned: number;

  @Column({ name: 'is_recycled', default: false })
  isRecycled: boolean;

  @Column({ name: 'recycled_at', type: 'timestamp', nullable: true })
  recycledAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recycled_by' })
  recycledBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
