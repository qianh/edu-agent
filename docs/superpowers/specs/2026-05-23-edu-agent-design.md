# 教师教学智能体 — MVP 第一阶段开发设计文档

**日期**：2026-05-23  
**范围**：MVP 第一阶段（核心闭环）  
**参考**：产品说明书 V1.0 + UI 稿 9 张

---

## 1. 技术栈

| 层级 | 选型 |
|------|------|
| 前端 | Next.js 15 (App Router) + TypeScript + Ant Design 5 |
| 后端 | Next.js API Routes（全栈） |
| 任务队列 | BullMQ + Redis 7 |
| 数据库 | PostgreSQL 16 + pgvector 扩展 |
| ORM | Prisma |
| AI 视觉 | GLM-5V API（批改痕迹识别、作业图像理解） |
| AI 文本 | DeepSeek API（批改推理、出题、报告） |
| 文件存储 | 本地文件系统（MVP） → 阿里云 OSS / 腾讯云 COS（生产，可配置） |
| 前端数据 | SWR（服务端状态）+ SSE（AI 任务进度） |
| 图表 | Recharts |
| 测试 | Vitest（单元/集成）+ Playwright（E2E） |
| 进程管理 | pm2（生产） |

---

## 2. 系统架构

### 2.1 分层结构

```
┌─────────────────────────────────────────┐
│              前端层                      │
│  Next.js App Router + Ant Design 5      │
│  SWR（数据）+ SSE（AI 进度）            │
└────────────────┬────────────────────────┘
                 │ HTTP
┌────────────────▼────────────────────────┐
│              API 层                      │
│  Next.js API Routes（26 个端点）         │
│  NextAuth.js（认证）                     │
└──────┬────────────────────┬─────────────┘
       │ 快速响应+入队        │ 查询/写入
┌──────▼──────────┐  ┌──────▼─────────────┐
│   Redis Queue   │  │   PostgreSQL 16    │
│   BullMQ        │  │   + pgvector       │
└──────┬──────────┘  └────────────────────┘
       │ 拾取任务
┌──────▼──────────────────────────────────┐
│              Worker 层                   │
│  ImageAnalysisWorker → GLM-5V           │
│  GradingWorker       → DeepSeek         │
│  QuestionGenWorker   → DeepSeek         │
│  MasteryUpdateWorker → 纯计算           │
└──────────────────────────────────────────┘
```

### 2.2 AI 统一接口

```typescript
interface AIProvider {
  analyzeImage(url: string, prompt: string, opts?: AIOptions): Promise<ImageAnalysisResult>
  generateText(prompt: string, ctx?: Context, opts?: AIOptions): Promise<string>
  generateEmbedding(text: string): Promise<number[]>
}
```

- `providerRegistry` 单例，运行时可热切换
- 系统设置页面配置每个接口绑定的模型 + API Key
- 默认：`analyzeImage` → GLM-5V，`generateText` → DeepSeek

### 2.3 关键数据流（作业上传）

```
教师上传作业图片
→ POST /api/assignments/upload
→ 文件存入 ./uploads/，返回 file_url
→ 创建 submission 记录（status: pending）
→ 入队 BullMQ：ImageAnalysisJob { submissionId }
→ 立即响应：{ jobId, status: "processing" }

Worker 异步处理：
→ 下载图片，图像预处理
→ GLM-5V：识别题目 / 答案 / 批阅痕迹
→ DeepSeek：错因分析 + 知识点匹配
→ 写 grading_result / teacher_mark 表
→ submission.status = "pending_confirm"
→ SSE 推送进度给前端

教师确认：
→ PATCH /api/assignments/:id/grading/confirm
→ 触发 MasteryUpdateWorker
→ 更新 student_mastery 表
→ 生成作业报告
```

---

## 3. MVP 第一阶段模块

### 3.1 七个核心模块

| 模块 | 路由 | 核心功能 |
|------|------|---------|
| ① 学生管理 | `/students`, `/students/[id]` | 列表·筛选·风险等级·详情·雷达图·热力图·作业历史 |
| ② 作业上传 | `/assignments/upload` | 选批阅模式·绑定学生·文件上传·进度反馈 |
| ③ AI 批改结果 | `/assignments/[id]/grading` | 图片标注叠加·每题建议分·错因·教师修改·确认 |
| ④ 批阅痕迹识别 | `/assignments/[id]/teacher-marks` | 对勾/叉/扣分/评语识别·低置信高亮·复核模式 |
| ⑤ 知识点管理 | `/knowledge/points` | 知识点列表·树状结构·题目关联（MVP 手动维护） |
| ⑥ 学生画像 | 嵌入学生详情 | 掌握度计算引擎·雷达图·热力图·诊断报告 |
| ⑦ 个性化出题 | `/questions/generate` | 薄弱点自动带入·题型/难度/数量·DeepSeek 生成·审核保存 |

### 3.2 三种批阅模式处理链

**模式①：未批阅 AI 批改**
```
上传 → ImageAnalysisWorker（GLM-5V 识别题目+答案）
     → GradingWorker（DeepSeek 判分+错因）
     → 前端展示 AI 建议分 → 教师修改确认
     → MasteryUpdateWorker
```

**模式②：已批阅痕迹识别**
```
上传 → ImageAnalysisWorker（GLM-5V 识别三层：原题/答案/批阅层）
     → 提取 ✓ ✗ 扣分 评语 + bbox
     → GradingWorker（知识点匹配+错因分析）
     → 前端展示识别结果 → 教师确认
     → MasteryUpdateWorker
```

**模式③：已批阅 + AI 复核**
```
上传 → ImageAnalysisWorker（同模式②）
     → ReviewWorker（DeepSeek 独立判分，并行）
     → 对比两份结果，标记疑似不一致
     → 前端展示「疑似需确认」提示
     → 教师逐项确认 → MasteryUpdateWorker
```

---

## 4. 数据模型

### 4.1 核心表（12 张）

```prisma
model Teacher {
  id        String   @id @default(cuid())
  name      String
  phone     String?
  email     String   @unique
  school    String?
  subject   String
  role      String   @default("teacher")
  createdAt DateTime @default(now())
  classes   Class[]
}

model Class {
  id         String    @id @default(cuid())
  name       String
  grade      String
  subject    String
  teacherId  String
  teacher    Teacher   @relation(fields: [teacherId], references: [id])
  students   Student[]
  createdAt  DateTime  @default(now())
}

model Student {
  id          String           @id @default(cuid())
  name        String
  studentNo   String           @unique
  classId     String
  class       Class            @relation(fields: [classId], references: [id])
  grade       String
  tags        String[]
  submissions Submission[]
  masteries   StudentMastery[]
  createdAt   DateTime         @default(now())
}

model KnowledgePoint {
  id          String           @id @default(cuid())
  name        String
  subject     String
  grade       String
  chapter     String?
  description String?
  difficulty  String           @default("medium")  // easy|medium|hard
  parentId    String?
  parent      KnowledgePoint?  @relation("KPTree", fields: [parentId], references: [id])
  children    KnowledgePoint[] @relation("KPTree")
  status      String           @default("active")
  masteries   StudentMastery[]
  results     GradingResult[]
  questions   Question[]
}

model Assignment {
  id              String       @id @default(cuid())
  title           String
  subject         String
  classId         String
  teacherId       String
  gradingMode     String       // ai_grade | teacher_mark | ai_review
  knowledgeScope  String[]
  submissions     Submission[]
  createdAt       DateTime     @default(now())
}

model Submission {
  id                    String          @id @default(cuid())
  assignmentId          String
  assignment            Assignment      @relation(fields: [assignmentId], references: [id])
  studentId             String
  student               Student         @relation(fields: [studentId], references: [id])
  fileUrl               String
  gradingMode           String
  status                String          @default("pending")
  // pending | processing | pending_confirm | confirmed | failed
  totalScoreDetected    Float?
  totalScoreConfirmed   Float?
  needReview            Boolean         @default(false)
  teacherMarks          TeacherMark[]
  gradingResults        GradingResult[]
  aiJobs                AIJob[]
  createdAt             DateTime        @default(now())
}

model TeacherMark {
  id                  String     @id @default(cuid())
  submissionId        String
  submission          Submission @relation(fields: [submissionId], references: [id])
  pageNo              Int        @default(1)
  questionNo          String
  markType            String     // tick | cross | half | circle | deduct | score | total | comment
  markText            String?
  bbox                Json       // { x, y, width, height }
  color               String?
  confidence          Float
  imageCropUrl        String?
  confirmedByTeacher  Boolean    @default(false)
}

model GradingResult {
  id                     String          @id @default(cuid())
  submissionId           String
  submission             Submission      @relation(fields: [submissionId], references: [id])
  questionNo             String
  studentAnswer          String?
  standardAnswer         String?
  aiScore                Float?
  teacherScoreDetected   Float?
  teacherScoreConfirmed  Float?
  finalScore             Float?
  finalSource            String?         // ai | teacher_detected | teacher_confirmed
  isCorrect              Boolean?
  knowledgePointId       String?
  knowledgePoint         KnowledgePoint? @relation(fields: [knowledgePointId], references: [id])
  errorType              String?         // 错因标签
  feedback               String?
  confidence             Float?
  conflictFlag           Boolean         @default(false)
  conflictReason         String?
}

model StudentMastery {
  id                 String         @id @default(cuid())
  studentId          String
  student            Student        @relation(fields: [studentId], references: [id])
  knowledgePointId   String
  knowledgePoint     KnowledgePoint @relation(fields: [knowledgePointId], references: [id])
  masteryScore       Float          @default(0)   // 0-100
  evidenceCount      Int            @default(0)
  lastUpdated        DateTime       @updatedAt

  @@unique([studentId, knowledgePointId])
}

model DiagnosisReport {
  id          String   @id @default(cuid())
  studentId   String
  content     Json     // 结构化报告内容
  confirmedBy String?
  createdAt   DateTime @default(now())
}

model Question {
  id               String          @id @default(cuid())
  content          String
  type             String          // single|fill|answer|essay
  answer           String?
  explanation      String?
  scoringCriteria  String?
  subject          String
  grade            String
  difficulty       Int             @default(3)  // 1-5
  knowledgePointId String?
  knowledgePoint   KnowledgePoint? @relation(fields: [knowledgePointId], references: [id])
  source           String          @default("ai_generated")
  status           String          @default("draft")  // draft|approved|archived
  useCount         Int             @default(0)
  createdAt        DateTime        @default(now())
}

model AIJob {
  id           String     @id @default(cuid())
  type         String     // image_analysis | grading | question_gen | mastery_update
  status       String     @default("pending")
  // pending | processing | completed | failed
  submissionId String?
  submission   Submission? @relation(fields: [submissionId], references: [id])
  result       Json?
  error        String?
  attempts     Int        @default(0)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
```

### 4.2 主要关系

```
Teacher → Class (1:N) → Student (1:N)
Assignment → Submission (1:N，每学生一份)
Submission → TeacherMark (1:N) + GradingResult (1:N，每题一条)
GradingResult → KnowledgePoint (N:1)
Student + KnowledgePoint → StudentMastery（多次作业累积更新）
KnowledgePoint → Question (1:N)
Submission → AIJob (1:N，追踪异步任务)
```

### 4.3 掌握度更新算法（`lib/mastery/calculator.ts`）

```typescript
// 综合权重因子
function updateMastery(current: number, evidence: MasteryEvidence[]): number {
  // 因子：题目难度 · 分值权重 · 得分率 · 错因类型 · 是否重复错误 · 近期权重衰减
  // 近期权重更高（指数加权移动平均）
  // 重复同类错误加重惩罚
  // 教师确认分优先于 AI 建议分
}
```

---

## 5. API Routes（26 个端点）

```
# 学生
GET    /api/students                      学生列表（支持筛选）
POST   /api/students                      新增学生
GET    /api/students/[id]                 学生详情
GET    /api/students/[id]/mastery         知识点掌握度
GET    /api/students/[id]/report          最新诊断报告
POST   /api/students/[id]/report/generate 触发报告生成

# 作业
GET    /api/assignments                           作业列表
POST   /api/assignments/upload                    上传作业（入队）
GET    /api/assignments/[id]                      作业详情
GET    /api/assignments/[id]/grading              AI 批改结果
PATCH  /api/assignments/[id]/grading/confirm      教师确认 AI 批改
GET    /api/assignments/[id]/teacher-marks        批阅痕迹识别结果
PATCH  /api/assignments/[id]/teacher-marks/confirm 确认痕迹识别
GET    /api/assignments/[id]/review               AI 复核结果
GET    /api/assignments/[id]/report               作业报告

# 知识点
GET    /api/knowledge/points              知识点列表/树
POST   /api/knowledge/points              新增知识点
GET    /api/knowledge/points/[id]         知识点详情

# 试题
GET    /api/questions                     题库列表
POST   /api/questions/generate            生成试题（入队）
POST   /api/questions/[id]/approve        审核通过入库

# 任务状态
GET    /api/jobs/[jobId]/status           任务状态查询
GET    /api/jobs/[jobId]/stream           SSE 实时进度推送

# 数据看板
GET    /api/dashboard/class/[id]          班级学情数据
```

---

## 6. 前端架构

### 6.1 目录结构

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   └── (dashboard)/layout.tsx              ← 侧边栏 + 顶栏
│       ├── page.tsx                         ← 首页智能助手
│       ├── students/
│       │   ├── page.tsx                     ← 学生列表
│       │   └── [id]/page.tsx               ← 学生详情
│       ├── assignments/
│       │   ├── page.tsx
│       │   ├── upload/page.tsx
│       │   └── [id]/
│       │       ├── grading/page.tsx
│       │       ├── teacher-marks/page.tsx
│       │       ├── review/page.tsx
│       │       └── report/page.tsx
│       ├── knowledge/points/page.tsx
│       ├── questions/generate/page.tsx
│       └── dashboard/class/[id]/page.tsx
├── components/
│   ├── assignments/
│   │   ├── AnnotatedImageViewer.tsx         ★ 核心：图片+SVG bbox 叠加层
│   │   ├── GradingResultPanel.tsx
│   │   └── UploadWizard.tsx
│   ├── students/
│   │   ├── RadarChart.tsx
│   │   ├── MasteryHeatmap.tsx               ★ 知识点掌握热力图
│   │   └── StudentCard.tsx
│   ├── questions/
│   │   └── QuestionGeneratorForm.tsx
│   └── shared/
│       ├── ConfidenceBadge.tsx              置信度三档颜色标记
│       ├── JobProgressBar.tsx               ★ SSE 进度条
│       └── AIStatusIndicator.tsx
├── lib/
│   ├── ai/
│   │   ├── provider.ts                      AIProvider 接口 + registry
│   │   ├── glm5v.ts                         GLM-5V 实现
│   │   └── deepseek.ts                      DeepSeek 实现
│   ├── queue/
│   │   ├── workers/
│   │   │   ├── image-analysis.worker.ts
│   │   │   ├── grading.worker.ts
│   │   │   ├── question-gen.worker.ts
│   │   │   └── mastery-update.worker.ts
│   │   └── worker-entry.ts                  Worker 进程入口
│   ├── db/
│   │   └── prisma.ts                        Prisma 单例
│   └── mastery/
│       └── calculator.ts                    掌握度计算引擎
└── types/                                   共享 TypeScript 类型
```

### 6.2 状态管理

| 状态类型 | 方案 | 用途 |
|---------|------|------|
| 服务端数据 | SWR | 学生列表、作业详情、掌握度数据 |
| AI 任务进度 | SSE + `useJobStream` Hook | 实时进度、完成通知 |
| 本地编辑状态 | useState / useReducer | 教师修改分数、表单状态、图片标注 hover |

### 6.3 核心组件：AnnotatedImageViewer

- 作业图片 + SVG 叠加层，bbox 渲染彩色矩形框
- 颜色编码：绿（✓ ≥85%）/ 红（✗ ≥85%）/ 橙（70–84%）/ 红色虚线（<70% 需复核）
- hover 显示题号 + 识别结果 tooltip
- click 右侧面板跳转对应题目
- 支持图片缩放 / 平移

---

## 7. Worker 设计

### 7.1 四个 Worker

| Worker | 触发时机 | AI 调用 | 输出 |
|--------|---------|---------|------|
| ImageAnalysisWorker | 作业上传后 | GLM-5V | TeacherMark + 题目区域 + bbox |
| GradingWorker | ImageAnalysis 完成后 | DeepSeek | GradingResult（分数+错因+知识点） |
| QuestionGenWorker | 教师点击生成试题 | DeepSeek | Question（草稿状态） |
| MasteryUpdateWorker | 教师确认批阅后 | 纯计算 | StudentMastery（upsert） |

### 7.2 重试策略

```typescript
// BullMQ Job 配置
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },  // 5s / 30s / 2min
  timeout: 60000  // 60s 超时（GLM-5V 图像处理）
}
```

### 7.3 GLM-5V Prompt 结构（批阅痕迹识别）

```
系统角色：你是一个专业的作业批阅结果识别系统。

任务：分析这份已经被教师批阅的作业图片，识别教师的批阅痕迹。

请识别并提取以下信息，以 JSON 格式返回：
- 每道题的题号
- 教师批阅标记类型（对勾/叉号/半对/圈画/扣分/评语）
- 该题得分或扣分数值
- 教师手写评语文字
- 每个批阅痕迹在图片中的位置（bbox: x, y, width, height，以图片宽高百分比表示）
- 识别置信度（0-1）

注意：
1. 区分原题印刷内容、学生手写答案、教师批阅痕迹三层
2. 重点识别第三层（教师批阅层）
3. 将每个批阅痕迹归属到最近的题号
4. 如果归属不确定，confidence 设为低值

返回格式：
{
  "total_score": number | null,
  "marks": [
    {
      "question_no": string,
      "mark_type": "tick|cross|half|deduct|score|comment|circle",
      "mark_text": string | null,
      "score_value": number | null,
      "bbox": { "x": 0.1, "y": 0.2, "width": 0.05, "height": 0.03 },
      "confidence": 0.92
    }
  ]
}
```

---

## 8. 错误处理

### 8.1 置信度三档

| 置信度 | 前端展示 | 行为 |
|--------|---------|------|
| ≥ 85% | 绿色，正常显示 | 可批量确认 |
| 70–84% | 橙色「建议确认」 | 可确认，有提示 |
| < 70% | 红色虚线「需复核」 | 阻断批量确认，需逐一处理 |

### 8.2 统一错误码

```
400 VALIDATION_ERROR      请求参数校验失败
401 UNAUTHORIZED          未登录
403 FORBIDDEN             越权访问（教师访问他人班级数据）
404 NOT_FOUND             资源不存在
409 CONFLICT              重复提交
422 AI_PARSE_ERROR        图像无法识别（模糊/格式不支持）
503 AI_UNAVAILABLE        AI 模型 API 不可用
```

### 8.3 分数优先级链

```
教师手动确认分 > 教师批阅识别分 > AI 自动批阅分 > AI 复核建议分
```

---

## 9. 测试策略

### 9.1 单元测试（Vitest）

- `lib/mastery/calculator.ts`：掌握度更新算法，多种场景（首次/重复错/权重/趋势）
- `lib/ai/provider.ts`：模型路由选择逻辑
- `lib/confidence.ts`：置信度分档规则
- 错因标签映射与知识点匹配规则

### 9.2 集成测试（Vitest + 测试数据库）

- 作业上传流程：创建记录 → 入队 → 状态查询
- 教师确认：分数更新 → 画像触发 → 报告生成
- 权限隔离：教师只能访问自己班级数据
- Worker 用 mock AIProvider 替代真实 API

### 9.3 E2E 测试（Playwright）

3 条核心主流程：
1. 上传未批阅作业 → AI 批改 → 教师确认 → 画像更新
2. 上传已批阅作业 → 识别结果 → 确认入库
3. 学生详情 → 生成试题 → 审核保存

### 9.4 AI 质量验收（离线脚本）

- 准备 20 份人工标注作业样本
- 目标：批阅痕迹识别准确率 ≥ 85%
- 目标：扣分识别准确率 ≥ 90%
- 不达标调整 Prompt，不改架构

---

## 10. 工程规范

### 10.1 前置依赖（本地直装，无 Docker）

```bash
# macOS
brew install postgresql@16 redis

# 启用 pgvector
psql -c "CREATE EXTENSION vector;"

# Windows
# PostgreSQL: 官网安装包
# Redis: Redis for Windows 或 WSL
```

### 10.2 环境变量（.env）

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/edu_agent

# Redis
REDIS_URL=redis://localhost:6379

# 文件存储（MVP 用 local，生产切 oss）
STORAGE_TYPE=local
UPLOAD_DIR=./uploads

# 生产 OSS 配置（STORAGE_TYPE=oss 时生效）
OSS_REGION=
OSS_BUCKET=
OSS_ACCESS_KEY=
OSS_SECRET_KEY=

# AI 模型
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
GLM_API_KEY=
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

### 10.3 开发启动

```bash
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed

# 终端 1：Next.js
pnpm dev

# 终端 2：BullMQ Worker
pnpm worker
```

### 10.4 生产部署（Linux 服务器）

```bash
pnpm build
pm2 start ecosystem.config.js

# ecosystem.config.js 管理两个进程：
# - web: next start (port 3000)
# - worker: node lib/queue/worker-entry.js
# Nginx 反代 :3000，certbot 配置 SSL
```

### 10.5 文件存储升级路径

```
MVP：STORAGE_TYPE=local → 文件存 ./uploads/，Next.js 静态路由提供服务
生产：STORAGE_TYPE=oss → 填入 OSS 配置，上传逻辑不变，只切存储层
```

---

## 11. 暂不实现（Phase 2+）

- 教材知识库解析（PDF 导入 → 知识点抽取）
- 知识图谱可视化
- 班级数据看板（Dashboard）
- 首页 AI Chatbox
- 错题本
- 分层试题生成
- 讲评课建议
- 家长端 / 学生端
