# 大型考试试卷保密流转系统

## 项目概述

本系统是一个大型考试试卷保密流转管理系统，服务于命题中心、印刷厂、押运人员和考点四个角色，实现试卷从命题、印刷、押运到考点的全流程保密管理。

## 核心功能

### 1. 命题中心
- 生成试卷批次，录入考试名称、科目、考试时间、启封时间等信息
- 管理批次生命周期：创建 → 印刷中 → 已封签 → 运输中 → 已送达 → 已启封 → 回收中 → 已归档
- 查看批次详情和统计数据

### 2. 印刷厂
- 登记封签箱号，关联试卷批次
- 封签操作，生成加密二维码
- 查看封签箱列表和试卷包明细
- 查看二维码用于交接

### 3. 押运人员
- 扫码交接，验证封签完整性
- 接收/拒绝交接任务
- 查看待接收和已发出的交接记录
- 异常上报（封签破损等）

### 4. 考点主任
- 确认试卷入库
- 启封管理（必须到启封时间才能启封）
- 查看试卷包信息（启封前隐藏敏感信息）
- 考后回收管理

### 5. 异常流程
- 封签破损自动进入异常流程
- 异常记录管理：报告 → 调查 → 解决 → 关闭
- 异常分类和统计

### 6. 回收归档
- 开始回收、提交回收数据
- 数量核验：回收数量与发出数量比对
- 归档阻断：数量不匹配时禁止归档
- 强制归档：特殊情况下可申请强制归档

## 技术架构

### 技术栈
- **前端**: React 18 + TypeScript + Vite + MUI (Material-UI)
- **后端**: NestJS 10 + TypeORM
- **数据库**: PostgreSQL 15
- **认证**: JWT + Passport
- **加密**: AES (二维码数据) + bcrypt (密码)
- **二维码**: qrcode (生成) + html5-qrcode/@zxing/library (扫码)
- **时间处理**: dayjs
- **HTTP 客户端**: Axios
- **路由**: React Router v6
- **状态管理**: React Context
- **数据表格**: MUI X-Data-Grid
- **通知提示**: react-toastify

### 项目结构
```
exam-paper-secrecy-system/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   │   ├── auth/       # 认证模块
│   │   │   ├── batches/    # 批次管理
│   │   │   ├── seal-boxes/ # 封签箱管理
│   │   │   ├── handover/   # 交接管理
│   │   │   ├── unseal/     # 启封管理
│   │   │   ├── exceptions/ # 异常管理
│   │   │   ├── recovery/   # 回收归档
│   │   │   └── common/     # 公共模块
│   │   ├── entities/       # 数据库实体
│   │   └── main.ts
│   ├── database/
│   │   └── init.sql        # 数据库初始化脚本
│   └── package.json
├── frontend/               # React 前端
│   ├── src/
│   │   ├── api/            # API 接口
│   │   ├── components/     # 公共组件
│   │   ├── contexts/       # React Context
│   │   ├── pages/          # 页面组件
│   │   ├── router/         # 路由配置
│   │   ├── types/          # TypeScript 类型
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── docker-compose.yml      # 数据库服务
└── package.json            # Monorepo 根配置
```

## 数据库设计

### 核心数据表
1. **users** - 用户表（含角色字段）
2. **exam_batches** - 试卷批次表
3. **seal_boxes** - 封签箱表
4. **exam_packages** - 试卷包表
5. **handover_records** - 交接记录表
6. **unseal_records** - 启封记录表
7. **exception_records** - 异常记录表
8. **recovery_records** - 回收记录表
9. **audit_logs** - 审计日志表

### 枚举类型
- `user_role`: admin, proposition_center, printing_factory, escort, exam_site
- `batch_status`: created, printing, sealed, in_transit, delivered, opened, recycling, archived
- `seal_status`: intact, damaged
- `handover_status`: pending, accepted, rejected
- `exception_status`: reported, investigating, resolved, closed

## 安全特性

1. **基于角色的访问控制 (RBAC)**
   - 不同角色只能访问授权的功能模块
   - 路由级和组件级双重权限校验

2. **数据加密**
   - 二维码数据 AES 加密，防止篡改
   - 用户密码 bcrypt 哈希存储

3. **时间控制**
   - 未到启封时间无法查看试卷包敏感信息
   - 未到启封时间无法执行启封操作

4. **异常阻断**
   - 封签破损自动触发异常流程
   - 回收数量不匹配阻断归档

5. **审计日志**
   - 所有关键操作自动记录
   - 可追溯操作人和操作时间

## 快速开始

### 环境要求
- Node.js >= 18
- PostgreSQL >= 15 (或使用 Docker)
- npm >= 9

### 启动步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd exam-paper-secrecy-system
```

2. **安装依赖**
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. **启动数据库**
```bash
npm run start:db
```

4. **初始化数据库**
```bash
# 执行 backend/database/init.sql 脚本
```

5. **启动后端服务**
```bash
npm run dev:backend
# 后端服务运行在 http://localhost:3001
# API 文档: http://localhost:3001/api
```

6. **启动前端服务**
```bash
npm run dev:frontend
# 前端服务运行在 http://localhost:3000
```

7. **同时启动前后端**
```bash
npm run dev
```

### 测试账号

系统预置以下测试账号：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 系统管理员 | admin | admin123 |
| 命题中心 | proposition | test123 |
| 印刷厂 | printing | test123 |
| 押运人员 | escort | test123 |
| 考点主任 | examsite | test123 |

## 业务流程

### 正常流转流程
```
命题中心创建批次 → 印刷厂登记封签箱 → 封签生成二维码
    → 押运员扫码交接 → 考点确认入库 → 到启封时间启封
    → 考试结束 → 开始回收 → 提交回收数据 → 数量核验通过 → 归档
```

### 异常处理流程
```
交接时发现封签破损 → 自动创建异常记录
    → 异常调查 → 确定责任人 → 制定解决方案 → 关闭异常
    → 后续试卷包进入异常处理流程
```

### 回收归档流程
```
开始回收 → 录入回收数量 → 系统自动比对
    ├─ 数量匹配 → 正常归档
    └─ 数量不匹配 → 阻断归档 → 人工核实 → 强制归档
```

## API 接口

### 认证接口
- `POST /auth/login` - 用户登录
- `POST /auth/logout` - 用户登出
- `GET /auth/profile` - 获取当前用户信息

### 批次管理
- `GET /batches` - 获取批次列表
- `POST /batches` - 创建批次
- `PUT /batches/:id` - 更新批次
- `DELETE /batches/:id` - 删除批次
- `PATCH /batches/:id/status` - 更新批次状态

### 封签箱管理
- `GET /seal-boxes` - 获取封签箱列表
- `POST /seal-boxes` - 创建封签箱
- `POST /seal-boxes/:id/seal` - 封签操作
- `GET /seal-boxes/:id/qrcode` - 获取二维码

### 交接管理
- `GET /handover` - 获取交接记录
- `POST /handover/scan` - 扫码交接
- `POST /handover/:id/accept` - 接收交接
- `POST /handover/:id/reject` - 拒绝交接

### 启封管理
- `POST /unseal/verify-time` - 验证启封时间
- `POST /unseal/:id` - 执行启封
- `GET /unseal/records` - 获取启封记录

### 异常管理
- `GET /exceptions` - 获取异常列表
- `POST /exceptions` - 报告异常
- `PATCH /exceptions/:id/status` - 更新异常状态

### 回收归档
- `GET /recovery` - 获取回收记录
- `POST /recovery` - 开始回收
- `POST /recovery/:id/submit` - 提交回收数据
- `POST /recovery/:id/archive` - 归档（含强制归档）

## 构建部署

### 构建前端
```bash
npm run build:frontend
# 输出到 frontend/dist
```

### 构建后端
```bash
npm run build:backend
# 输出到 backend/dist
```

### 构建全部
```bash
npm run build
```

## 开发规范

### 前端开发规范
- 使用 TypeScript 严格模式
- 组件采用函数式组件 + Hooks
- 使用 MUI 组件库，遵循设计规范
- API 调用统一封装在 `src/api/client.ts`
- 类型定义集中在 `src/types/index.ts`

### 后端开发规范
- 采用 NestJS 模块化架构
- 使用 TypeORM 进行数据库操作
- Controller → Service → Repository 三层架构
- DTO 进行参数校验
- 全局异常处理

## 注意事项

1. **启封时间控制**: 系统时间必须准确，建议使用 NTP 时间同步
2. **二维码安全**: 二维码包含加密数据，请勿在不安全环境下传输
3. **数据备份**: 定期备份数据库，防止数据丢失
4. **权限管理**: 生产环境请修改默认密码，启用强密码策略
5. **日志审计**: 定期审计操作日志，发现异常及时处理

## License

MIT
