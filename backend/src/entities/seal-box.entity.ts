import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { ExamBatch } from './exam-batch.entity';
import { ExamPackage } from './exam-package.entity';
import { User } from './user.entity';

@Entity('seal_boxes')
export class SealBox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamBatch, batch => batch.sealBoxes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: ExamBatch;

  @Column({ name: 'box_number', unique: true, length: 100 })
  boxNumber: string;

  @Column({ name: 'seal_number', unique: true, length: 100 })
  sealNumber: string;

  @Column({ name: 'package_count' })
  packageCount: number;

  @Column({ name: 'package_start_number' })
  packageStartNumber: number;

  @Column({ name: 'package_end_number' })
  packageEndNumber: number;

  @Column({ name: 'exam_site', length: 200 })
  examSite: string;

  @Column({ name: 'is_sealed', default: false })
  isSealed: boolean;

  @Column({ name: 'sealed_at', type: 'timestamp', nullable: true })
  sealedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sealed_by' })
  sealedBy: User;

  @Column({ name: 'seal_intact', default: true })
  sealIntact: boolean;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string;

  @OneToMany(() => ExamPackage, pkg => pkg.box)
  packages: ExamPackage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
