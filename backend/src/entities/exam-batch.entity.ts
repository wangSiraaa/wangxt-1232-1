import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { SealBox } from './seal-box.entity';
import { ExamPackage } from './exam-package.entity';

export type BatchStatus = 'created' | 'printing' | 'sealed' | 'in_transit' | 'delivered' | 'opened' | 'recycling' | 'archived' | 'exception';

@Entity('exam_batches')
export class ExamBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_code', unique: true, length: 50 })
  batchCode: string;

  @Column({ name: 'exam_name', length: 200 })
  examName: string;

  @Column({ name: 'exam_subject', length: 100 })
  examSubject: string;

  @Column({ name: 'exam_date', type: 'date' })
  examDate: Date;

  @Column({ name: 'unseal_time', type: 'timestamp' })
  unsealTime: Date;

  @Column({ name: 'exam_start_time', type: 'timestamp' })
  examStartTime: Date;

  @Column({ name: 'exam_end_time', type: 'timestamp' })
  examEndTime: Date;

  @Column({ name: 'total_packages' })
  totalPackages: number;

  @Column({ name: 'total_boxes' })
  totalBoxes: number;

  @Column({
    type: 'enum',
    enum: ['created', 'printing', 'sealed', 'in_transit', 'delivered', 'opened', 'recycling', 'archived', 'exception'],
    default: 'created'
  })
  status: BatchStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @OneToMany(() => SealBox, box => box.batch)
  sealBoxes: SealBox[];

  @OneToMany(() => ExamPackage, pkg => pkg.batch)
  packages: ExamPackage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
