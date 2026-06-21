-- 试卷保密流转系统数据库初始化脚本

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 角色类型枚举
CREATE TYPE user_role AS ENUM ('proposition_center', 'printing_factory', 'escort', 'exam_site_director', 'admin');

-- 批次状态枚举
CREATE TYPE batch_status AS ENUM ('created', 'printing', 'sealed', 'in_transit', 'delivered', 'opened', 'recycling', 'archived', 'exception');

-- 交接状态枚举
CREATE TYPE handover_status AS ENUM ('pending', 'confirmed', 'rejected');

-- 异常类型枚举
CREATE TYPE exception_type AS ENUM ('seal_damaged', 'package_missing', 'count_mismatch', 'time_violation', 'other');

-- 异常状态枚举
CREATE TYPE exception_status AS ENUM ('reported', 'investigating', 'resolved', 'closed');

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    organization VARCHAR(200),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 考试批次表
CREATE TABLE exam_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    exam_name VARCHAR(200) NOT NULL,
    exam_subject VARCHAR(100) NOT NULL,
    exam_date DATE NOT NULL,
    unseal_time TIMESTAMP NOT NULL,
    exam_start_time TIMESTAMP NOT NULL,
    exam_end_time TIMESTAMP NOT NULL,
    total_packages INTEGER NOT NULL,
    total_boxes INTEGER NOT NULL,
    status batch_status DEFAULT 'created',
    created_by UUID REFERENCES users(id),
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 封签箱号表
CREATE TABLE seal_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES exam_batches(id) ON DELETE CASCADE,
    box_number VARCHAR(100) UNIQUE NOT NULL,
    seal_number VARCHAR(100) UNIQUE NOT NULL,
    package_count INTEGER NOT NULL,
    package_start_number INTEGER NOT NULL,
    package_end_number INTEGER NOT NULL,
    exam_site VARCHAR(200) NOT NULL,
    is_sealed BOOLEAN DEFAULT false,
    sealed_at TIMESTAMP,
    sealed_by UUID REFERENCES users(id),
    seal_intact BOOLEAN DEFAULT true,
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 试卷包表
CREATE TABLE exam_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES exam_batches(id) ON DELETE CASCADE,
    box_id UUID REFERENCES seal_boxes(id) ON DELETE CASCADE,
    package_number VARCHAR(50) UNIQUE NOT NULL,
    exam_site VARCHAR(200) NOT NULL,
    candidate_count INTEGER NOT NULL,
    is_opened BOOLEAN DEFAULT false,
    opened_at TIMESTAMP,
    opened_by UUID REFERENCES users(id),
    answer_sheets_returned INTEGER,
    is_recycled BOOLEAN DEFAULT false,
    recycled_at TIMESTAMP,
    recycled_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 交接记录表
CREATE TABLE handover_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id UUID REFERENCES seal_boxes(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES exam_batches(id) ON DELETE CASCADE,
    from_role user_role NOT NULL,
    to_role user_role NOT NULL,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    status handover_status DEFAULT 'pending',
    seal_intact BOOLEAN,
    handover_time TIMESTAMP,
    location VARCHAR(200),
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 启封记录表
CREATE TABLE unseal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES exam_batches(id) ON DELETE CASCADE,
    box_id UUID REFERENCES seal_boxes(id) ON DELETE CASCADE,
    package_id UUID REFERENCES exam_packages(id),
    unsealed_by UUID REFERENCES users(id),
    unseal_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exam_site VARCHAR(200) NOT NULL,
    witnesses TEXT[],
    seal_intact BOOLEAN DEFAULT true,
    exception_reported BOOLEAN DEFAULT false,
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 异常处理表
CREATE TABLE exception_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES exam_batches(id) ON DELETE CASCADE,
    box_id UUID REFERENCES seal_boxes(id),
    package_id UUID REFERENCES exam_packages(id),
    exception_type exception_type NOT NULL,
    exception_status exception_status DEFAULT 'reported',
    reported_by UUID REFERENCES users(id),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    location VARCHAR(200),
    investigation_result TEXT,
    resolution TEXT,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    related_photos TEXT[],
    witnesses TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回收归档表
CREATE TABLE recovery_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES exam_batches(id) ON DELETE CASCADE,
    box_id UUID REFERENCES seal_boxes(id),
    recovered_by UUID REFERENCES users(id),
    recovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_packages INTEGER NOT NULL,
    actual_packages INTEGER NOT NULL,
    expected_answer_sheets INTEGER NOT NULL,
    actual_answer_sheets INTEGER NOT NULL,
    count_matched BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,
    archived_by UUID REFERENCES users(id),
    blocking_reason TEXT,
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_exam_batches_status ON exam_batches(status);
CREATE INDEX idx_exam_batches_exam_date ON exam_batches(exam_date);
CREATE INDEX idx_seal_boxes_batch_id ON seal_boxes(batch_id);
CREATE INDEX idx_seal_boxes_box_number ON seal_boxes(box_number);
CREATE INDEX idx_exam_packages_batch_id ON exam_packages(batch_id);
CREATE INDEX idx_exam_packages_box_id ON exam_packages(box_id);
CREATE INDEX idx_handover_records_box_id ON handover_records(box_id);
CREATE INDEX idx_handover_records_status ON handover_records(status);
CREATE INDEX idx_exception_records_status ON exception_records(exception_status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要更新时间的表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exam_batches_updated_at BEFORE UPDATE ON exam_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_seal_boxes_updated_at BEFORE UPDATE ON seal_boxes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exam_packages_updated_at BEFORE UPDATE ON exam_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_handover_records_updated_at BEFORE UPDATE ON handover_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exception_records_updated_at BEFORE UPDATE ON exception_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_recovery_records_updated_at BEFORE UPDATE ON recovery_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 插入初始测试用户（admin 密码: admin123，其他用户密码: test123）
INSERT INTO users (username, password_hash, full_name, role, organization, phone) VALUES
('admin', '$2b$10$uYAyrY2LT0dr0SBwhJfImO5hE6Ds5ERjk.3pAIAcQ6mjQzo7RX5/2', '系统管理员', 'admin', '考试管理中心', '13800000000'),
('proposition', '$2b$10$sVwyVxHyWBFz1vUrKFLRROnD3sR5iHGfKNxGgJsPAzixbXIL1dFUO', '张命题', 'proposition_center', '命题中心', '13800000001'),
('printing', '$2b$10$sVwyVxHyWBFz1vUrKFLRROnD3sR5iHGfKNxGgJsPAzixbXIL1dFUO', '李印刷', 'printing_factory', '保密印刷厂', '13800000002'),
('escort', '$2b$10$sVwyVxHyWBFz1vUrKFLRROnD3sR5iHGfKNxGgJsPAzixbXIL1dFUO', '王押运', 'escort', '押运公司一队', '13800000003'),
('examsite', '$2b$10$sVwyVxHyWBFz1vUrKFLRROnD3sR5iHGfKNxGgJsPAzixbXIL1dFUO', '赵主任', 'exam_site_director', '第一中学考点', '13800000004');
