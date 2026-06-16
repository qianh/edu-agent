# 教师教学智能体（edu-agent）

> 以作业分析和知识点诊断为核心的 AI 教学工作台，帮助教师从「经验判断」升级为「数据驱动的精准教学」。

## 产品概述

教师教学智能体是一套面向教师的 AI 教学辅助系统，围绕学生作业、教材知识库、试题库和学生画像，帮助教师完成：

1. 作业上传与智能分析
2. 未批阅作业的 AI 自动批改
3. 已批阅作业的教师批阅痕迹识别
4. 学生知识点掌握情况诊断
5. 学生能力画像构建
6. 班级学情分析
7. 个性化试题生成
8. 教学资源沉淀与复用

系统的核心不是简单替代教师批改，而是把教师日常教学中的作业、批阅、错题、知识点、学生表现转化为结构化数据，辅助教师更高效地进行诊断、讲评、补弱和个性化教学。

### 核心闭环

```
教材 / 资料导入
→ 知识点抽取
→ 作业上传
→ 批阅状态判断
→ 未批阅：AI 自动批改
→ 已批阅：识别教师批阅结果
→ 错题与知识点关联
→ 学生能力画像更新
→ 诊断报告生成
→ 个性化试题生成
→ 再练习
→ 再诊断
```

### 三种批阅模式

| 模式 | 说明 |
|------|------|
| 未批阅 AI 批改 | AI 识别题目与答案，给出建议分、错因与知识点匹配，教师确认后更新掌握度 |
| 已批阅痕迹识别 | AI 识别对勾、叉号、扣分、评语等教师批阅痕迹，提取结构化结果 |
| 已批阅 + AI 复核 | AI 独立判分并与教师批阅对比，标记疑似不一致项供教师逐项确认 |

## 功能模块

### MVP 第一阶段（当前实现范围）

| 模块 | 路由 | 功能 |
|------|------|------|
| 首页智能助手 | `/` | Chatbox、快捷任务、最近报告 |
| 学生管理 | `/students`、`/students/[id]` | 列表、筛选、详情、雷达图、掌握度热力图、作业历史 |
| 作业管理 | `/assignments`、`/assignments/upload` | 作业列表、上传、批阅模式选择 |
| AI 批改结果 | `/assignments/[id]/grading` | 图片标注、建议分、错因、教师修改与确认 |
| 知识点管理 | `/knowledge/points` | 知识点列表与维护 |
| 个性化出题 | `/questions/generate` | 薄弱点带入、题型/难度/数量配置、AI 生成与审核 |
| 班级看板 | `/class-dashboard` | 班级学情概览 |
| 系统设置 | `/settings` | 教师信息与系统配置 |
| 登录 | `/login` | 邮箱或手机号 + 密码登录 |

### 暂不实现（后续阶段）

- 教材知识库解析（PDF 导入 → 知识点抽取）
- 知识图谱可视化
- 学生端 / 家长端
- 校级数据中台
- 自动替代教师最终评分

完整产品说明见 [教师教学智能体产品说明书 V1.0.md](./教师教学智能体产品说明书%20V1.0.md)。

## 技术栈

| 层级 | 选型 |
|------|------|
| 前端 | Next.js 15 (App Router) + TypeScript + Ant Design 5 |
| 后端 | Next.js API Routes（全栈单体） |
| 认证 | next-auth v4（JWT Session） |
| 任务队列 | BullMQ + Redis |
| 数据库 | PostgreSQL + pgvector |
| ORM | Prisma |
| AI 视觉 | GLM-5V（批改痕迹识别、作业图像理解） |
| AI 文本 | DeepSeek（批改推理、出题、报告） |
| 文件存储 | 本地文件系统（MVP）→ OSS（生产可配置） |
| 前端数据 | SWR + SSE（AI 任务进度） |
| 图表 | Recharts |
| 测试 | Vitest + Playwright |

## 系统架构

```
┌─────────────────────────────────────────┐
│              前端层                      │
│  Next.js App Router + Ant Design 5      │
│  SWR（数据）+ SSE（AI 进度）            │
└────────────────┬────────────────────────┘
                 │ HTTP
┌────────────────▼────────────────────────┐
│              API 层                      │
│  Next.js API Routes + NextAuth          │
└──────┬────────────────────┬─────────────┘
       │ 快速响应+入队        │ 查询/写入
┌──────▼──────────┐  ┌──────▼─────────────┐
│   Redis Queue   │  │   PostgreSQL         │
│   BullMQ        │  │   + pgvector         │
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

## 快速开始

### 前置依赖

```bash
# macOS
brew install postgresql@16 redis

# 启用 pgvector
psql -c "CREATE EXTENSION vector;"
```

### 安装与启动

```bash
pnpm install
pnpm prisma migrate dev

# 可选：创建测试教师账号
pnpm tsx scripts/seed-teacher.ts

# 终端 1：Next.js 开发服务器
pnpm dev

# 终端 2：BullMQ Worker（处理 AI 异步任务）
pnpm worker

# 或一键启动两者
pnpm dev:all
```

访问 http://localhost:3000 ，使用邮箱或手机号 + 密码登录。首次登录时若账号不存在，系统会自动创建（静默注册）。

### 环境变量

复制 `.env.local` 并填写以下配置：

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/edu_agent

# Redis
REDIS_URL=redis://localhost:6379

# 文件存储
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
NEXT_PUBLIC_UPLOAD_URL=/api/uploads

# AI 模型
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
GLM_API_KEY=
GLM_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

## 认证说明

- **登录方式**：邮箱或手机号 + 密码（CredentialsProvider）
- **自动注册**：首次登录时若账号不存在，系统静默创建，`name` 默认为邮箱前缀或手机号，`subject` 默认为「未设置」
- **Session**：next-auth JWT，保存 `teacherId` / `email` / `name` / `subject` / `role`
- **路由保护**：Next.js middleware 保护 dashboard 页面，未登录重定向至 `/login`
- **当前阶段不支持**：独立注册页、邮箱验证、OAuth、密码找回

详见 [CONTEXT.md](./CONTEXT.md)。

## 个性化出题

基于学生 `StudentMastery.masteryScore` 判定薄弱点（< 60）与良好点（≥ 60），按 90/10 权重从候选知识点池抽样出题。

出题分两阶段：

1. **出题大纲**：按题型分别调用 LLM，生成草稿级题干与答案
2. **逐题生成**：按大纲逐条润色为正式题目，并校验是否偏离大纲

图表题支持几何图形与数据图表（`chartSpec` + 代码渲染）；实验图当前仅产出 `chartImagePrompt` 提示词，待后续接入文生图。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Next.js 开发服务器 |
| `pnpm worker` | 启动 BullMQ Worker |
| `pnpm dev:all` | 同时启动 Web 与 Worker |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务器 |
| `pnpm test` | 运行 Vitest 单元/集成测试 |
| `pnpm test:e2e` | 运行 Playwright E2E 测试 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 检查 |

## 项目结构

```
edu-agent/
├── src/
│   ├── app/                    # Next.js App Router 页面与 API
│   │   ├── (dashboard)/        # 需登录的仪表盘页面
│   │   ├── api/                # REST API 端点
│   │   └── login/              # 登录页
│   ├── components/             # React 组件
│   ├── hooks/                  # 自定义 Hooks
│   └── lib/                    # 核心业务逻辑
│       ├── ai/                 # AI Provider 抽象层
│       ├── queue/              # BullMQ 队列与 Worker
│       ├── question-gen/       # 个性化出题引擎
│       ├── storage/            # 文件存储抽象层
│       └── mastery/            # 掌握度计算
├── prisma/                     # 数据库 Schema 与迁移
├── scripts/                    # 运维脚本（种子数据、密码迁移等）
├── docs/                       # 设计文档与规格说明
├── openspec/                   # OpenSpec 变更管理
├── CONTEXT.md                  # 领域上下文与术语定义
└── 教师教学智能体产品说明书 V1.0.md  # 完整产品说明书
```

## 相关文档

| 文档 | 说明 |
|------|------|
| [教师教学智能体产品说明书 V1.0.md](./教师教学智能体产品说明书%20V1.0.md) | 完整产品需求与功能规格 |
| [docs/superpowers/specs/2026-05-23-edu-agent-design.md](./docs/superpowers/specs/2026-05-23-edu-agent-design.md) | MVP 技术设计文档 |
| [CONTEXT.md](./CONTEXT.md) | 领域术语、认证与出题概念定义 |
| [docs/adr/](./docs/adr/) | 架构决策记录 |

## 版本规划

| 阶段 | 目标 |
|------|------|
| 第一阶段（当前） | 跑通核心闭环：作业上传 → AI 批改/识别 → 掌握度更新 → 个性化出题 |
| 第二阶段 | 教材知识库解析、能力雷达图增强、班级分析、错题本、AI 批阅复核 |
| 第三阶段 | 多学科、多教师协作、年级组看板、学生端练习、校本资源库 |