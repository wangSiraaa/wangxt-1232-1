import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { ExamBatch } from './exam-batch.entity';
import { SealBox } from './seal-box.entity';
import { User } from './user.entity';
import { UserRole } from './user.entity';

export type HandoverStatus = 'pending' | 'confirmed' | 'rejected';

@Entity('handover_records')
export class HandoverRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SealBox, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'box_id' })
  box: SealBox;

  @ManyToOne(() => ExamBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: ExamBatch;

  @Column({ name: 'from_role', type: 'enum', enum: ['proposition_center', 'printing_factory', 'escort', 'exam_site_director', 'admin'] })
  fromRole: UserRole;

  @Column({ name: 'to_role', type: 'enum', enum: ['proposition_center', 'printing_factory', 'escort', 'exam_site_director', 'admin'] })
  toRole: UserRole;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'to_user_id' })
  toUser: User;

  @Column({ type: 'enum', enum: ['pending', 'confirmed', 'rejected'], default: 'pending' })
  status: HandoverStatus;

  @Column({ name: 'seal_intact', nullable: true })
  sealIntact: boolean;

  @Column({ name: 'handover_time', type: 'timestamp', nullable: true })
  handoverTime: Date;

  @Column({ length: 200, nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
