import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { ExamBatch } from './exam-batch.entity';
import { SealBox } from './seal-box.entity';
import { ExamPackage } from './exam-package.entity';
import { User } from './user.entity';

@Entity('unseal_records')
export class UnsealRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: ExamBatch;

  @ManyToOne(() => SealBox, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'box_id' })
  box: SealBox;

  @ManyToOne(() => ExamPackage)
  @JoinColumn({ name: 'package_id' })
  package: ExamPackage;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'unsealed_by' })
  unsealedBy: User;

  @Column({ name: 'unseal_time', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  unsealTime: Date;

  @Column({ name: 'exam_site', length: 200 })
  examSite: string;

  @Column({ type: 'text', array: true, nullable: true })
  witnesses: string[];

  @Column({ name: 'seal_intact', default: true })
  sealIntact: boolean;

  @Column({ name: 'exception_reported', default: false })
  exceptionReported: boolean;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
