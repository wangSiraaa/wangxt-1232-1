export enum UserRole {
  ADMIN = 'admin',
  PROPOSITION_CENTER = 'proposition_center',
  PRINTING_FACTORY = 'printing_factory',
  ESCORT = 'escort',
  EXAM_SITE = 'exam_site',
}

export enum BatchStatus {
  CREATED = 'created',
  PRINTING = 'printing',
  SEALED = 'sealed',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  RECYCLING = 'recycling',
  ARCHIVED = 'archived',
  EXCEPTION = 'exception',
}

export enum HandoverStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum ExceptionType {
  SEAL_DAMAGED = 'seal_damaged',
  PACKAGE_MISSING = 'package_missing',
  QUANTITY_MISMATCH = 'quantity_mismatch',
  OTHER = 'other',
}

export enum ExceptionStatus {
  REPORTED = 'reported',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  organization: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ExamBatch {
  id: string;
  batchCode: string;
  examName: string;
  examDate: string;
  unsealTime: string;
  subject: string;
  totalPackages: number;
  status: BatchStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SealBox {
  id: string;
  boxNumber: string;
  batchId: string;
  packageCount: number;
  sealStatus: 'intact' | 'damaged';
  qrCode: string;
  qrCodeData: string;
  sealedAt: string;
  sealedBy: string;
}

export interface ExamPackage {
  id: string;
  packageCode: string;
  boxId: string;
  batchId: string;
  subject: string;
  examSite: string;
  sealed: boolean;
  qrCode: string;
  createdAt: string;
}

export interface HandoverRecord {
  id: string;
  boxId: string;
  batchId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: UserRole;
  toRole: UserRole;
  status: HandoverStatus;
  sealIntact: boolean;
  remarks: string;
  createdAt: string;
  confirmedAt: string;
}

export interface UnsealRecord {
  id: string;
  packageId: string;
  batchId: string;
  unsealedBy: string;
  unsealedAt: string;
  witnesses: string[];
  remarks: string;
}

export interface ExceptionRecord {
  id: string;
  batchId: string;
  boxId?: string;
  packageId?: string;
  type: ExceptionType;
  status: ExceptionStatus;
  description: string;
  reportedBy: string;
  investigation?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryRecord {
  id: string;
  batchId: string;
  totalPackages: number;
  recoveredPackages: number;
  missingPackages: number;
  countMatched: boolean;
  blockingReason?: string;
  recoveredBy: string;
  recoveredAt: string;
  archived: boolean;
  archivedAt?: string;
  remarks: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
