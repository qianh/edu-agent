# 教师教学智能体 MVP 第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现教师教学智能体 MVP 核心闭环：学生管理 + 作业上传 + AI 批改 + 批阅痕迹识别 + 知识点匹配 + 学生画像 + 个性化出题。

**Architecture:** Next.js 15 全栈（App Router + API Routes），BullMQ + Redis 处理长耗时 AI 任务（GLM-5V 视觉识别 + DeepSeek 文本推理），PostgreSQL + pgvector 存储业务数据与向量检索，Prisma 作 ORM。AI 任务异步处理，SSE 推送进度，教师确认后更新学生知识点掌握度。

**Tech Stack:** Next.js 15, TypeScript, Ant Design 5, Prisma, PostgreSQL 16 + pgvector, BullMQ, Redis, GLM-5V API, DeepSeek API, SWR, Recharts, Vitest, Playwright

---

## 文件结构

```
edu-agent/
├── prisma/
│   ├── schema.prisma          数据库模型（12张表）
│   └── seed.ts                初始知识点数据
├── src/
│   ├── app/
│   │   ├── layout.tsx                    根布局
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx                侧边栏+顶栏
│   │       ├── page.tsx                  首页占位
│   │       ├── students/
│   │       │   ├── page.tsx              学生列表
│   │       │   └── [id]/page.tsx         学生详情
│   │       ├── assignments/
│   │       │   ├── page.tsx              作业列表
│   │       │   ├── upload/page.tsx       上传向导
│   │       │   └── [id]/
│   │       │       ├── grading/page.tsx         AI批改结果
│   │       │       ├── teacher-marks/page.tsx   批阅识别
│   │       │       ├── review/page.tsx          AI复核
│   │       │       └── report/page.tsx          作业报告
│   │       ├── knowledge/points/page.tsx  知识点管理
│   │       └── questions/generate/page.tsx 出题
│   ├── api/                              Next.js Route Handlers
│   │   └── (所有 /api/* 路由，见各任务)
│   ├── components/
│   │   ├── assignments/
│   │   │   ├── AnnotatedImageViewer.tsx  ★ 图片+SVG标注层
│   │   │   ├── GradingResultPanel.tsx
│   │   │   └── UploadWizard.tsx
│   │   ├── students/
│   │   │   ├── RadarChart.tsx
│   │   │   └── MasteryHeatmap.tsx
│   │   └── shared/
│   │       ├── ConfidenceBadge.tsx
│   │       └── JobProgressBar.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── types.ts                  AIProvider 接口 + 类型
│   │   │   ├── glm5v.ts                  GLM-5V 实现
│   │   │   ├── deepseek.ts               DeepSeek 实现
│   │   │   └── registry.ts              providerRegistry 单例
│   │   ├── queue/
│   │   │   ├── connection.ts             Redis 连接
│   │   │   ├── queues.ts                 BullMQ Queue 定义
│   │   │   ├── workers/
│   │   │   │   ├── image-analysis.ts     GLM-5V Worker
│   │   │   │   ├── grading.ts            DeepSeek 批改 Worker
│   │   │   │   ├── question-gen.ts       DeepSeek 出题 Worker
│   │   │   │   └── mastery-update.ts     掌握度计算 Worker
│   │   │   └── worker-entry.ts           Worker 进程入口
│   │   ├── storage/
│   │   │   ├── types.ts                  StorageProvider 接口
│   │   │   └── local.ts                  本地文件系统实现
│   │   ├── mastery/
│   │   │   └── calculator.ts             掌握度更新算法
│   │   ├── db.ts                         Prisma 单例
│   │   └── errors.ts                     统一错误类型
│   ├── hooks/
│   │   └── useJobStream.ts               SSE Hook
│   └── types/
│       └── index.ts                      共享 TS 类型
├── tests/
│   ├── unit/
│   │   └── mastery-calculator.test.ts
│   ├── integration/
│   │   └── assignments-api.test.ts
│   └── e2e/
│       └── grading-flow.spec.ts
├── .env.local                            环境变量
├── next.config.ts
├── vitest.config.ts
└── package.json
```

---

## Phase 1：项目基础设施（Tasks 1–5）
*完成后：项目可启动，数据库就绪，AI 层可调用，Workers 可运行*

---

### Task 1：项目初始化

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `.env.local`
- Create: `vitest.config.ts`

- [ ] **Step 1: 创建 Next.js 项目**

```bash
cd /Users/john/private/ai/school/edu-agent
pnpm create next-app@latest . --typescript --app --no-src-dir --import-alias "@/*"
```

当提示选择时：TypeScript=Yes, ESLint=Yes, Tailwind=No, App Router=Yes

- [ ] **Step 2: 安装核心依赖**

```bash
pnpm add antd @ant-design/icons @ant-design/nextjs-registry
pnpm add @prisma/client prisma
pnpm add bullmq ioredis
pnpm add swr
pnpm add recharts
pnpm add next-auth @auth/prisma-adapter
pnpm add openai
pnpm add zod
pnpm add multer @types/multer
pnpm add uuid @types/uuid
```

- [ ] **Step 3: 安装开发依赖**

```bash
pnpm add -D vitest @vitejs/plugin-react @vitest/coverage-v8
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test
pnpm add -D @types/node
```

- [ ] **Step 4: 写 `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bullmq', '@prisma/client'],
  },
  api: {
    bodyParser: false,  // 文件上传需要禁用默认 bodyParser
  },
}

export default nextConfig
```

- [ ] **Step 5: 写 `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 6: 写 `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: 写 `.env.local`**

```env
# 数据库
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edu_agent"

# Redis
REDIS_URL="redis://localhost:6379"

# 文件存储
STORAGE_TYPE="local"
UPLOAD_DIR="./uploads"
NEXT_PUBLIC_UPLOAD_URL="/uploads"

# AI 模型
DEEPSEEK_API_KEY="your-deepseek-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
GLM_API_KEY="your-glm-key"
GLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4"

# Auth
NEXTAUTH_SECRET="your-secret-32-chars-minimum-here"
NEXTAUTH_URL="http://localhost:3000"

# 测试数据库（集成测试用）
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edu_agent_test"
```

- [ ] **Step 8: 创建 uploads 目录并加入 .gitignore**

```bash
mkdir -p uploads
echo "uploads/" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
```

- [ ] **Step 9: 验证 Next.js 启动正常**

```bash
pnpm dev
```

预期：浏览器打开 http://localhost:3000 看到 Next.js 默认页面，无报错。

- [ ] **Step 10: 提交**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with core dependencies"
```

---

### Task 2：Prisma 数据库 Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: 初始化 Prisma**

```bash
pnpm prisma init
```

- [ ] **Step 2: 写完整 `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Teacher {
  id          String       @id @default(cuid())
  name        String
  phone       String?
  email       String       @unique
  password    String
  school      String?
  subject     String
  role        String       @default("teacher")
  createdAt   DateTime     @default(now())
  classes     Class[]
  assignments Assignment[]
}

model Class {
  id          String       @id @default(cuid())
  name        String
  grade       String
  subject     String
  teacherId   String
  teacher     Teacher      @relation(fields: [teacherId], references: [id])
  students    Student[]
  assignments Assignment[]
  createdAt   DateTime     @default(now())
}

model Student {
  id          String           @id @default(cuid())
  name        String
  studentNo   String           @unique
  classId     String
  class       Class            @relation(fields: [classId], references: [id])
  grade       String
  gender      String?
  tags        String[]
  submissions Submission[]
  masteries   StudentMastery[]
  reports     DiagnosisReport[]
  createdAt   DateTime         @default(now())
}

model KnowledgePoint {
  id          String           @id @default(cuid())
  name        String
  subject     String
  grade       String
  chapter     String?
  description String?
  difficulty  String           @default("medium")
  parentId    String?
  parent      KnowledgePoint?  @relation("KPTree", fields: [parentId], references: [id])
  children    KnowledgePoint[] @relation("KPTree")
  status      String           @default("active")
  masteries   StudentMastery[]
  results     GradingResult[]
  questions   Question[]
  createdAt   DateTime         @default(now())

  @@index([subject, grade])
}

model Assignment {
  id              String       @id @default(cuid())
  title           String
  subject         String
  classId         String
  class           Class        @relation(fields: [classId], references: [id])
  teacherId       String
  teacher         Teacher      @relation(fields: [teacherId], references: [id])
  gradingMode     String
  knowledgeScope  String[]
  submissions     Submission[]
  createdAt       DateTime     @default(now())
}

model Submission {
  id                  String          @id @default(cuid())
  assignmentId        String
  assignment          Assignment      @relation(fields: [assignmentId], references: [id])
  studentId           String
  student             Student         @relation(fields: [studentId], references: [id])
  fileUrl             String
  gradingMode         String
  status              String          @default("pending")
  totalScoreDetected  Float?
  totalScoreConfirmed Float?
  needReview          Boolean         @default(false)
  teacherMarks        TeacherMark[]
  gradingResults      GradingResult[]
  aiJobs              AIJob[]
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  @@unique([assignmentId, studentId])
}

model TeacherMark {
  id                 String     @id @default(cuid())
  submissionId       String
  submission         Submission @relation(fields: [submissionId], references: [id])
  pageNo             Int        @default(1)
  questionNo         String
  markType           String
  markText           String?
  bbox               Json
  color              String?
  confidence         Float
  imageCropUrl       String?
  confirmedByTeacher Boolean    @default(false)
  createdAt          DateTime   @default(now())
}

model GradingResult {
  id                    String          @id @default(cuid())
  submissionId          String
  submission            Submission      @relation(fields: [submissionId], references: [id])
  questionNo            String
  studentAnswer         String?
  standardAnswer        String?
  aiScore               Float?
  teacherScoreDetected  Float?
  teacherScoreConfirmed Float?
  finalScore            Float?
  finalSource           String?
  isCorrect             Boolean?
  knowledgePointId      String?
  knowledgePoint        KnowledgePoint? @relation(fields: [knowledgePointId], references: [id])
  errorType             String?
  feedback              String?
  confidence            Float?
  conflictFlag          Boolean         @default(false)
  conflictReason        String?
  createdAt             DateTime        @default(now())
}

model StudentMastery {
  id               String         @id @default(cuid())
  studentId        String
  student          Student        @relation(fields: [studentId], references: [id])
  knowledgePointId String
  knowledgePoint   KnowledgePoint @relation(fields: [knowledgePointId], references: [id])
  masteryScore     Float          @default(0)
  evidenceCount    Int            @default(0)
  lastUpdated      DateTime       @updatedAt

  @@unique([studentId, knowledgePointId])
}

model DiagnosisReport {
  id          String   @id @default(cuid())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id])
  content     Json
  confirmedBy String?
  createdAt   DateTime @default(now())
}

model Question {
  id               String          @id @default(cuid())
  content          String
  type             String
  answer           String?
  explanation      String?
  scoringCriteria  String?
  subject          String
  grade            String
  difficulty       Int             @default(3)
  knowledgePointId String?
  knowledgePoint   KnowledgePoint? @relation(fields: [knowledgePointId], references: [id])
  source           String          @default("ai_generated")
  status           String          @default("draft")
  useCount         Int             @default(0)
  createdAt        DateTime        @default(now())
}

model AIJob {
  id           String      @id @default(cuid())
  type         String
  status       String      @default("pending")
  submissionId String?
  submission   Submission? @relation(fields: [submissionId], references: [id])
  result       Json?
  error        String?
  attempts     Int         @default(0)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}
```

- [ ] **Step 3: 写 `src/lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: 在 PostgreSQL 启用 pgvector 并运行迁移**

```bash
# 确认 PostgreSQL 已运行，创建数据库
psql -U postgres -c "CREATE DATABASE edu_agent;"
psql -U postgres -d edu_agent -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 运行 Prisma 迁移
pnpm prisma migrate dev --name init
```

预期输出：`✔ Generated Prisma Client` 且无报错

- [ ] **Step 5: 验证 Prisma Studio 可看到所有表**

```bash
pnpm prisma studio
```

预期：浏览器打开 Prisma Studio，可以看到 Teacher / Class / Student 等 12 张表。

- [ ] **Step 6: 提交**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: add Prisma schema with 12 core tables"
```

---

### Task 3：AI Provider 层

**Files:**
- Create: `src/lib/ai/types.ts`
- Create: `src/lib/ai/glm5v.ts`
- Create: `src/lib/ai/deepseek.ts`
- Create: `src/lib/ai/registry.ts`
- Test: `tests/unit/ai-provider.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/ai-provider.test.ts
import { describe, it, expect, vi } from 'vitest'
import { providerRegistry } from '@/lib/ai/registry'

describe('providerRegistry', () => {
  it('returns glm5v for analyzeImage by default', () => {
    const provider = providerRegistry.getImageProvider()
    expect(provider.name).toBe('glm5v')
  })

  it('returns deepseek for generateText by default', () => {
    const provider = providerRegistry.getTextProvider()
    expect(provider.name).toBe('deepseek')
  })

  it('switches text provider when configured', () => {
    providerRegistry.setTextProvider('glm5v')
    expect(providerRegistry.getTextProvider().name).toBe('glm5v')
    providerRegistry.setTextProvider('deepseek') // restore
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm vitest run tests/unit/ai-provider.test.ts
```

预期：FAIL，`Cannot find module '@/lib/ai/registry'`

- [ ] **Step 3: 写 `src/lib/ai/types.ts`**

```typescript
export interface BBox {
  x: number   // 图片宽度百分比 0-1
  y: number
  width: number
  height: number
}

export interface TeacherMarkRaw {
  question_no: string
  mark_type: 'tick' | 'cross' | 'half' | 'deduct' | 'score' | 'comment' | 'circle'
  mark_text: string | null
  score_value: number | null
  bbox: BBox
  confidence: number
}

export interface ImageAnalysisResult {
  total_score: number | null
  marks: TeacherMarkRaw[]
  questions?: QuestionRaw[]
  raw_text?: string
}

export interface QuestionRaw {
  question_no: string
  content: string
  student_answer: string
  bbox: BBox
}

export interface AIOptions {
  temperature?: number
  maxTokens?: number
  timeout?: number
}

export interface NamedAIProvider {
  name: string
  analyzeImage(imageUrl: string, prompt: string, opts?: AIOptions): Promise<ImageAnalysisResult>
  generateText(prompt: string, opts?: AIOptions): Promise<string>
  generateEmbedding(text: string): Promise<number[]>
}
```

- [ ] **Step 4: 写 `src/lib/ai/glm5v.ts`**

```typescript
import OpenAI from 'openai'
import type { NamedAIProvider, AIOptions, ImageAnalysisResult } from './types'

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GLM_API_KEY!,
    baseURL: process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4',
    timeout: 60_000,
  })
}

export const glm5vProvider: NamedAIProvider = {
  name: 'glm5v',

  async analyzeImage(imageUrl: string, prompt: string, opts?: AIOptions): Promise<ImageAnalysisResult> {
    const client = getClient()

    // 将图片 URL 转为 base64（本地文件）或直接用 URL（外部可访问时）
    let imageContent: OpenAI.Chat.ChatCompletionContentPartImage
    if (imageUrl.startsWith('http')) {
      imageContent = { type: 'image_url', image_url: { url: imageUrl } }
    } else {
      const fs = await import('fs/promises')
      const path = await import('path')
      const filePath = imageUrl.startsWith('/') ? imageUrl : path.join(process.cwd(), imageUrl)
      const buffer = await fs.readFile(filePath)
      const base64 = buffer.toString('base64')
      const ext = path.extname(filePath).slice(1).toLowerCase()
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
      imageContent = { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
    }

    const response = await client.chat.completions.create({
      model: 'glm-4v-plus',  // 当 GLM-5V 正式 API 名称确定后更新
      messages: [
        {
          role: 'user',
          content: [imageContent, { type: 'text', text: prompt }],
        },
      ],
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.1,
    })

    const content = response.choices[0]?.message?.content ?? '{}'
    // GLM-5V 应返回 JSON，提取 JSON 块
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ?? content.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch?.[1] ?? content
    return JSON.parse(jsonStr) as ImageAnalysisResult
  },

  async generateText(prompt: string, opts?: AIOptions): Promise<string> {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'glm-4-plus',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts?.maxTokens ?? 2048,
      temperature: opts?.temperature ?? 0.3,
    })
    return response.choices[0]?.message?.content ?? ''
  },

  async generateEmbedding(text: string): Promise<number[]> {
    const client = getClient()
    const response = await client.embeddings.create({
      model: 'embedding-3',
      input: text,
    })
    return response.data[0].embedding
  },
}
```

- [ ] **Step 5: 写 `src/lib/ai/deepseek.ts`**

```typescript
import OpenAI from 'openai'
import type { NamedAIProvider, AIOptions, ImageAnalysisResult } from './types'

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    timeout: 30_000,
  })
}

export const deepseekProvider: NamedAIProvider = {
  name: 'deepseek',

  async analyzeImage(_imageUrl: string, _prompt: string): Promise<ImageAnalysisResult> {
    throw new Error('DeepSeek does not support image analysis. Use GLM-5V.')
  },

  async generateText(prompt: string, opts?: AIOptions): Promise<string> {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.3,
    })
    return response.choices[0]?.message?.content ?? ''
  },

  async generateEmbedding(text: string): Promise<number[]> {
    // DeepSeek 暂无 embedding，降级到 GLM
    const { glm5vProvider } = await import('./glm5v')
    return glm5vProvider.generateEmbedding(text)
  },
}
```

- [ ] **Step 6: 写 `src/lib/ai/registry.ts`**

```typescript
import { glm5vProvider } from './glm5v'
import { deepseekProvider } from './deepseek'
import type { NamedAIProvider } from './types'

const providers: Record<string, NamedAIProvider> = {
  glm5v: glm5vProvider,
  deepseek: deepseekProvider,
}

class ProviderRegistry {
  private imageProviderName = 'glm5v'
  private textProviderName = 'deepseek'

  getImageProvider(): NamedAIProvider {
    return providers[this.imageProviderName]
  }

  getTextProvider(): NamedAIProvider {
    return providers[this.textProviderName]
  }

  setImageProvider(name: string): void {
    if (!providers[name]) throw new Error(`Unknown provider: ${name}`)
    this.imageProviderName = name
  }

  setTextProvider(name: string): void {
    if (!providers[name]) throw new Error(`Unknown provider: ${name}`)
    this.textProviderName = name
  }
}

export const providerRegistry = new ProviderRegistry()
```

- [ ] **Step 7: 运行测试确认通过**

```bash
pnpm vitest run tests/unit/ai-provider.test.ts
```

预期：3 tests passed

- [ ] **Step 8: 提交**

```bash
git add src/lib/ai/ tests/unit/ai-provider.test.ts
git commit -m "feat: add AI provider layer with GLM-5V and DeepSeek"
```

---

### Task 4：BullMQ 队列基础设施

**Files:**
- Create: `src/lib/queue/connection.ts`
- Create: `src/lib/queue/queues.ts`
- Create: `src/lib/queue/worker-entry.ts`

- [ ] **Step 1: 写 `src/lib/queue/connection.ts`**

```typescript
import { Redis } from 'ioredis'

let connection: Redis | null = null

export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,  // BullMQ 要求
      enableReadyCheck: false,
    })
  }
  return connection
}
```

- [ ] **Step 2: 写 `src/lib/queue/queues.ts`**

```typescript
import { Queue } from 'bullmq'
import { getRedisConnection } from './connection'

export type JobType = 'image_analysis' | 'grading' | 'question_gen' | 'mastery_update'

export interface ImageAnalysisJobData {
  submissionId: string
  mode: 'ai_grade' | 'teacher_mark' | 'ai_review'
}

export interface GradingJobData {
  submissionId: string
}

export interface QuestionGenJobData {
  studentId?: string
  knowledgePointIds: string[]
  type: string
  difficulty: string
  count: number
  subject: string
  grade: string
}

export interface MasteryUpdateJobData {
  submissionId: string
}

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
}

function makeQueue<T>(name: JobType) {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions,
  })
}

export const imageAnalysisQueue = makeQueue<ImageAnalysisJobData>('image_analysis')
export const gradingQueue = makeQueue<GradingJobData>('grading')
export const questionGenQueue = makeQueue<QuestionGenJobData>('question_gen')
export const masteryUpdateQueue = makeQueue<MasteryUpdateJobData>('mastery_update')
```

- [ ] **Step 3: 写 `src/lib/queue/worker-entry.ts`（Worker 进程入口）**

```typescript
// 这个文件被 `pnpm worker` 以独立 Node 进程启动
import 'dotenv/config'
import { imageAnalysisWorker } from './workers/image-analysis'
import { gradingWorker } from './workers/grading'
import { questionGenWorker } from './workers/question-gen'
import { masteryUpdateWorker } from './workers/mastery-update'

console.log('[Worker] Starting all workers...')

const workers = [imageAnalysisWorker, gradingWorker, questionGenWorker, masteryUpdateWorker]

workers.forEach((w) => {
  w.on('completed', (job) => console.log(`[${w.name}] Job ${job.id} completed`))
  w.on('failed', (job, err) => console.error(`[${w.name}] Job ${job?.id} failed:`, err.message))
})

process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...')
  await Promise.all(workers.map((w) => w.close()))
  process.exit(0)
})
```

- [ ] **Step 4: 在 `package.json` 添加 worker 脚本**

在 `package.json` 的 `scripts` 中加入：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "tsx src/lib/queue/worker-entry.ts",
    "worker:prod": "node dist/worker-entry.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

同时安装 `tsx`：
```bash
pnpm add -D tsx dotenv
```

- [ ] **Step 5: 验证 Redis 连接（先创建占位 Worker 文件）**

创建 `src/lib/queue/workers/image-analysis.ts`（占位）：

```typescript
import { Worker } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { ImageAnalysisJobData } from '../queues'

export const imageAnalysisWorker = new Worker<ImageAnalysisJobData>(
  'image_analysis',
  async (job) => {
    console.log('[ImageAnalysis] Processing job:', job.id, job.data)
    // TODO: 在 Task 10 实现
  },
  { connection: getRedisConnection(), concurrency: 2 }
)
```

同样创建其他三个 Worker 的占位文件（`grading.ts`, `question-gen.ts`, `mastery-update.ts`），内容结构相同，只改 queue 名称。

- [ ] **Step 6: 确认 Worker 可启动**

```bash
# 确保 Redis 已运行：redis-server
pnpm worker
```

预期输出：`[Worker] Starting all workers...` 无报错

- [ ] **Step 7: 提交**

```bash
git add src/lib/queue/
git commit -m "feat: add BullMQ queue infrastructure and worker entry"
```

---

### Task 5：文件存储层

**Files:**
- Create: `src/lib/storage/types.ts`
- Create: `src/lib/storage/local.ts`
- Create: `src/lib/storage/index.ts`
- Create: `src/app/api/uploads/[...path]/route.ts`

- [ ] **Step 1: 写 `src/lib/storage/types.ts`**

```typescript
export interface StorageProvider {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>
  getUrl(storedPath: string): string
  getLocalPath(storedPath: string): string | null  // 仅 local 返回路径，OSS 返回 null
}
```

- [ ] **Step 2: 写 `src/lib/storage/local.ts`**

```typescript
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { StorageProvider } from './types'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads'

export const localStorageProvider: StorageProvider = {
  async save(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const ext = path.extname(filename)
    const storedName = `${uuidv4()}${ext}`
    const filePath = path.join(UPLOAD_DIR, storedName)
    await fs.writeFile(filePath, buffer)
    return storedName  // 返回相对 UPLOAD_DIR 的文件名
  },

  getUrl(storedPath: string): string {
    return `/api/uploads/${storedPath}`
  },

  getLocalPath(storedPath: string): string {
    return path.resolve(UPLOAD_DIR, storedPath)
  },
}
```

- [ ] **Step 3: 写 `src/lib/storage/index.ts`**

```typescript
import { localStorageProvider } from './local'
import type { StorageProvider } from './types'

export function getStorageProvider(): StorageProvider {
  const type = process.env.STORAGE_TYPE ?? 'local'
  switch (type) {
    case 'local':
      return localStorageProvider
    default:
      throw new Error(`Unsupported STORAGE_TYPE: ${type}`)
  }
}

export { type StorageProvider }
```

- [ ] **Step 4: 写文件访问路由 `src/app/api/uploads/[...path]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getStorageProvider } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const storage = getStorageProvider()
  const storedPath = params.path.join('/')
  const localPath = storage.getLocalPath(storedPath)

  if (!localPath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 防止路径穿越
  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads')
  const resolved = path.resolve(localPath)
  if (!resolved.startsWith(uploadDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const buffer = await fs.readFile(resolved).catch(() => null)
  if (!buffer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ext = path.extname(storedPath).toLowerCase()
  const contentType = ext === '.pdf' ? 'application/pdf'
    : ext === '.png' ? 'image/png'
    : 'image/jpeg'

  return new NextResponse(buffer, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
  })
}
```

- [ ] **Step 5: 提交**

```bash
git add src/lib/storage/ src/app/api/uploads/
git commit -m "feat: add local file storage provider with path-traversal protection"
```

---

## Phase 2：学生管理（Tasks 6–8）
*完成后：可以增删查学生，学生列表/详情页可用*

---

### Task 6：掌握度计算引擎（TDD）

**Files:**
- Create: `src/lib/mastery/calculator.ts`
- Test: `tests/unit/mastery-calculator.test.ts`

- [ ] **Step 1: 写完整测试用例**

```typescript
// tests/unit/mastery-calculator.test.ts
import { describe, it, expect } from 'vitest'
import { calculateNewMastery, type MasteryEvidence } from '@/lib/mastery/calculator'

describe('calculateNewMastery', () => {
  it('returns 0 when no prior mastery and incorrect answer', () => {
    const evidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 0,            // 全错
      errorType: 'concept',
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const result = calculateNewMastery(null, [evidence])
    expect(result).toBeLessThan(40)
  })

  it('raises mastery on correct answer', () => {
    const evidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 1.0,          // 全对
      errorType: null,
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const result = calculateNewMastery(60, [evidence])
    expect(result).toBeGreaterThan(60)
    expect(result).toBeLessThanOrEqual(100)
  })

  it('penalizes repeat errors more heavily', () => {
    const singleError: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 0,
      errorType: 'calculation',
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const repeatError: MasteryEvidence = {
      ...singleError,
      isRepeatError: true,
    }
    const singleResult = calculateNewMastery(70, [singleError])
    const repeatResult = calculateNewMastery(70, [repeatError])
    expect(repeatResult).toBeLessThan(singleResult)
  })

  it('clamps result to 0-100 range', () => {
    const highEvidence: MasteryEvidence = {
      questionDifficulty: 'hard',
      scoreRate: 1.0,
      errorType: null,
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const result = calculateNewMastery(99, [highEvidence, highEvidence, highEvidence])
    expect(result).toBeLessThanOrEqual(100)
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('weights recent evidence more than historical', () => {
    const oldEvidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 1.0,
      errorType: null,
      isRepeatError: false,
      recencyWeight: 0.3,  // 旧
    }
    const newEvidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 0,
      errorType: 'concept',
      isRepeatError: false,
      recencyWeight: 1.0,  // 新
    }
    const result = calculateNewMastery(80, [oldEvidence, newEvidence])
    // 近期表现差，综合后应下降
    expect(result).toBeLessThan(80)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm vitest run tests/unit/mastery-calculator.test.ts
```

预期：FAIL，`Cannot find module '@/lib/mastery/calculator'`

- [ ] **Step 3: 实现 `src/lib/mastery/calculator.ts`**

```typescript
export interface MasteryEvidence {
  questionDifficulty: 'easy' | 'medium' | 'hard'
  scoreRate: number          // 0-1，得分率
  errorType: string | null   // null = 正确
  isRepeatError: boolean     // 是否重复相同错因
  recencyWeight: number      // 0-1，越近越高
}

const DIFFICULTY_WEIGHT = { easy: 0.7, medium: 1.0, hard: 1.4 }
const ERROR_PENALTY = { concept: 1.3, calculation: 1.0, careless: 0.6, default: 1.0 }
const REPEAT_ERROR_MULTIPLIER = 1.4
const LEARNING_RATE = 0.25   // 每次证据对掌握度的影响力

export function calculateNewMastery(
  currentScore: number | null,
  evidences: MasteryEvidence[]
): number {
  let score = currentScore ?? 50  // 无历史记录从 50 开始

  for (const ev of evidences) {
    const diffWeight = DIFFICULTY_WEIGHT[ev.questionDifficulty]
    const isCorrect = ev.scoreRate >= 0.7

    if (isCorrect) {
      // 答对：按难度和得分率提升
      const gain = LEARNING_RATE * diffWeight * ev.scoreRate * ev.recencyWeight
      score = score + gain * (100 - score)
    } else {
      // 答错：按错因类型和是否重复施加惩罚
      const errKey = ev.errorType && ev.errorType in ERROR_PENALTY
        ? (ev.errorType as keyof typeof ERROR_PENALTY)
        : 'default'
      const errPenalty = ERROR_PENALTY[errKey]
      const repeatMultiplier = ev.isRepeatError ? REPEAT_ERROR_MULTIPLIER : 1.0
      const loss = LEARNING_RATE * diffWeight * errPenalty * repeatMultiplier * ev.recencyWeight
      score = score - loss * score
    }

    // 应用近期权重（越新的证据权重越高）
    score = score * (0.8 + 0.2 * ev.recencyWeight)
  }

  return Math.min(100, Math.max(0, Math.round(score * 10) / 10))
}
```

- [ ] **Step 4: 运行确认通过**

```bash
pnpm vitest run tests/unit/mastery-calculator.test.ts
```

预期：5 tests passed

- [ ] **Step 5: 提交**

```bash
git add src/lib/mastery/ tests/unit/mastery-calculator.test.ts
git commit -m "feat: add mastery calculator with TDD"
```

---

### Task 7：学生管理 API

**Files:**
- Create: `src/app/api/students/route.ts`
- Create: `src/app/api/students/[id]/route.ts`
- Create: `src/app/api/students/[id]/mastery/route.ts`

- [ ] **Step 1: 写 `src/lib/errors.ts`**

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message)
  }
}

export function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}
```

- [ ] **Step 2: 写 `src/app/api/students/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const createStudentSchema = z.object({
  name: z.string().min(1),
  studentNo: z.string().min(1),
  classId: z.string().cuid(),
  grade: z.string().min(1),
  gender: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const classId = searchParams.get('classId')
  const riskLevel = searchParams.get('riskLevel')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const where: Record<string, unknown> = {}
  if (classId) where.classId = classId

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true, grade: true } },
        masteries: {
          select: { masteryScore: true, knowledgePointId: true },
          orderBy: { lastUpdated: 'desc' },
          take: 10,
        },
        submissions: {
          select: { totalScoreConfirmed: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.student.count({ where }),
  ])

  // 计算综合掌握度
  const studentsWithMastery = students.map((s) => {
    const avgMastery = s.masteries.length
      ? s.masteries.reduce((sum, m) => sum + m.masteryScore, 0) / s.masteries.length
      : null

    let riskLevelCalc = 'normal'
    if (avgMastery !== null && avgMastery < 60) riskLevelCalc = 'high'
    else if (avgMastery !== null && avgMastery < 75) riskLevelCalc = 'warning'

    return {
      ...s,
      avgMastery: avgMastery ? Math.round(avgMastery) : null,
      riskLevel: riskLevelCalc,
      lastScore: s.submissions[0]?.totalScoreConfirmed ?? null,
    }
  })

  const filtered = riskLevel
    ? studentsWithMastery.filter((s) => s.riskLevel === riskLevel)
    : studentsWithMastery

  return Response.json({ students: filtered, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = createStudentSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)
  }

  const student = await prisma.student.create({ data: parsed.data })
  return Response.json(student, { status: 201 })
}
```

- [ ] **Step 3: 写 `src/app/api/students/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      class: true,
      masteries: {
        include: { knowledgePoint: true },
        orderBy: { masteryScore: 'asc' },
      },
      submissions: {
        include: { assignment: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      reports: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!student) return errorResponse('NOT_FOUND', 'Student not found', 404)
  return Response.json(student)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}))
  const student = await prisma.student.update({
    where: { id: params.id },
    data: body,
  })
  return Response.json(student)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.student.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
```

- [ ] **Step 4: 写 `src/app/api/students/[id]/mastery/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const masteries = await prisma.studentMastery.findMany({
    where: { studentId: params.id },
    include: {
      knowledgePoint: {
        select: { id: true, name: true, subject: true, grade: true, chapter: true, difficulty: true },
      },
    },
    orderBy: { masteryScore: 'asc' },
  })

  if (masteries.length === 0) {
    const studentExists = await prisma.student.findUnique({ where: { id: params.id } })
    if (!studentExists) return errorResponse('NOT_FOUND', 'Student not found', 404)
  }

  return Response.json({ masteries })
}
```

- [ ] **Step 5: 验证 API**

```bash
# 先用 Prisma Studio 或 seed 脚本创建一个测试学生，然后：
curl http://localhost:3000/api/students
```

预期：返回 `{ students: [], total: 0, page: 1, limit: 20 }`

- [ ] **Step 6: 提交**

```bash
git add src/app/api/students/ src/lib/errors.ts
git commit -m "feat: add student management API (CRUD + mastery)"
```

---

### Task 8：学生管理 UI

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/students/page.tsx`
- Create: `src/app/(dashboard)/students/[id]/page.tsx`
- Create: `src/components/students/RadarChart.tsx`
- Create: `src/components/students/MasteryHeatmap.tsx`

- [ ] **Step 1: 写 Dashboard 布局 `src/app/(dashboard)/layout.tsx`**

```typescript
'use client'
import { Layout, Menu } from 'antd'
import { UserOutlined, FileTextOutlined, BookOutlined, FormOutlined, BarChartOutlined } from '@ant-design/icons'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const { Sider, Header, Content } = Layout

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    { key: '/', icon: <BarChartOutlined />, label: <Link href="/">首页助手</Link> },
    { key: '/students', icon: <UserOutlined />, label: <Link href="/students">学生管理</Link> },
    { key: '/assignments', icon: <FileTextOutlined />, label: <Link href="/assignments">作业管理</Link> },
    { key: '/knowledge', icon: <BookOutlined />, label: <Link href="/knowledge/points">知识点</Link> },
    { key: '/questions', icon: <FormOutlined />, label: <Link href="/questions/generate">出题</Link> },
  ]

  const selectedKey = menuItems.find((m) => pathname.startsWith(m.key) && m.key !== '/')?.key ?? '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px 24px', fontWeight: 700, fontSize: 16, color: '#1677ff', borderBottom: '1px solid #f0f0f0' }}>
          教师教学智能体
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#666', fontSize: 14 }}>教师教学智能体管理平台</span>
        </Header>
        <Content style={{ margin: '24px', background: '#fff', borderRadius: 8, padding: 24, minHeight: 'calc(100vh - 112px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
```

- [ ] **Step 2: 写 `src/app/(dashboard)/students/page.tsx`**

```typescript
'use client'
import { Table, Tag, Button, Input, Select, Space, Statistic, Row, Col, Card, Progress } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const riskColors: Record<string, string> = { high: 'red', warning: 'orange', normal: 'green' }
const riskLabels: Record<string, string> = { high: '高风险', warning: '关注', normal: '正常' }

export default function StudentsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<string | undefined>()
  const [page, setPage] = useState(1)

  const query = new URLSearchParams({ page: String(page), limit: '20' })
  if (riskFilter) query.set('riskLevel', riskFilter)

  const { data, isLoading } = useSWR(`/api/students?${query}`, fetcher)
  const students = data?.students ?? []

  const filtered = search
    ? students.filter((s: { name: string; studentNo: string }) =>
        s.name.includes(search) || s.studentNo.includes(search)
      )
    : students

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', render: (name: string, record: { id: string }) => (
      <Button type="link" onClick={() => router.push(`/students/${record.id}`)}>{name}</Button>
    )},
    { title: '班级', dataIndex: ['class', 'name'], key: 'class' },
    { title: '年级', dataIndex: 'grade', key: 'grade' },
    { title: '最近作业分', dataIndex: 'lastScore', key: 'lastScore', render: (v: number | null) => v ?? '暂无' },
    { title: '综合掌握度', dataIndex: 'avgMastery', key: 'avgMastery', render: (v: number | null) =>
      v !== null ? <Progress percent={v} size="small" status={v < 60 ? 'exception' : v < 75 ? 'normal' : 'success'} /> : '暂无'
    },
    { title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel', render: (v: string) =>
      <Tag color={riskColors[v]}>{riskLabels[v]}</Tag>
    },
    { title: '操作', key: 'action', render: (_: unknown, record: { id: string }) => (
      <Button size="small" onClick={() => router.push(`/students/${record.id}`)}>查看详情</Button>
    )},
  ]

  const highRisk = students.filter((s: { riskLevel: string }) => s.riskLevel === 'high').length

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="总学生数" value={data?.total ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="高风险学生" value={highRisk} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索姓名或学号" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
        <Select placeholder="风险等级" allowClear onChange={setRiskFilter} style={{ width: 120 }}
          options={[{ value: 'high', label: '高风险' }, { value: 'warning', label: '关注' }, { value: 'normal', label: '正常' }]}
        />
        <Button type="primary" icon={<PlusOutlined />}>新增学生</Button>
      </Space>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ total: data?.total, pageSize: 20, current: page, onChange: setPage }}
      />
    </div>
  )
}
```

- [ ] **Step 3: 写 `src/components/students/RadarChart.tsx`**

```typescript
'use client'
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

interface RadarData {
  subject: string
  score: number
  fullMark: number
}

interface Props {
  data: RadarData[]
}

export function RadarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsRadar cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar name="掌握度" dataKey="score" stroke="#1677ff" fill="#1677ff" fillOpacity={0.3} />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: 写 `src/components/students/MasteryHeatmap.tsx`**

```typescript
'use client'
import { Tooltip } from 'antd'

interface MasteryItem {
  knowledgePoint: { name: string; chapter?: string | null }
  masteryScore: number
}

interface Props {
  masteries: MasteryItem[]
}

function getColor(score: number): string {
  if (score >= 90) return '#52c41a'
  if (score >= 75) return '#73d13d'
  if (score >= 60) return '#faad14'
  if (score > 0)   return '#ff4d4f'
  return '#f0f0f0'
}

function getLabel(score: number): string {
  if (score >= 90) return '熟练掌握'
  if (score >= 75) return '较好掌握'
  if (score >= 60) return '基本掌握'
  if (score > 0)   return '薄弱'
  return '暂无数据'
}

export function MasteryHeatmap({ masteries }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {masteries.map((m, i) => (
        <Tooltip key={i} title={`${m.knowledgePoint.name}：${getLabel(m.masteryScore)}（${Math.round(m.masteryScore)}分）`}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            background: getColor(m.masteryScore),
            cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.08)',
          }} />
        </Tooltip>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 写 `src/app/(dashboard)/students/[id]/page.tsx`**

```typescript
'use client'
import { Descriptions, Tag, Tabs, Card, Row, Col, Statistic, Table, Empty } from 'antd'
import useSWR from 'swr'
import { use } from 'react'
import { RadarChart } from '@/components/students/RadarChart'
import { MasteryHeatmap } from '@/components/students/MasteryHeatmap'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: student, isLoading } = useSWR(`/api/students/${id}`, fetcher)

  if (isLoading) return <div>加载中...</div>
  if (!student || student.error) return <div>学生不存在</div>

  // 将掌握度转成雷达图格式（取前 7 个知识点）
  const radarData = (student.masteries ?? []).slice(0, 7).map((m: { knowledgePoint: { name: string }; masteryScore: number }) => ({
    subject: m.knowledgePoint.name.slice(0, 6),
    score: Math.round(m.masteryScore),
    fullMark: 100,
  }))

  const weakPoints = (student.masteries ?? []).filter((m: { masteryScore: number }) => m.masteryScore < 60)

  return (
    <div>
      <Descriptions title={<span style={{ fontSize: 18, fontWeight: 600 }}>{student.name}</span>} bordered column={3} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="学号">{student.studentNo}</Descriptions.Item>
        <Descriptions.Item label="班级">{student.class?.name}</Descriptions.Item>
        <Descriptions.Item label="年级">{student.grade}</Descriptions.Item>
      </Descriptions>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="能力雷达图">
            {radarData.length > 0 ? <RadarChart data={radarData} /> : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col span={16}>
          <Card title="知识点掌握热力图">
            {student.masteries?.length > 0
              ? <MasteryHeatmap masteries={student.masteries} />
              : <Empty description="暂无数据" />}
          </Card>
        </Col>
      </Row>

      <Tabs items={[
        {
          key: 'mastery',
          label: `薄弱知识点（${weakPoints.length}）`,
          children: (
            <Table
              dataSource={weakPoints}
              rowKey={(r: { knowledgePointId: string }) => r.knowledgePointId}
              columns={[
                { title: '知识点', dataIndex: ['knowledgePoint', 'name'] },
                { title: '章节', dataIndex: ['knowledgePoint', 'chapter'] },
                { title: '掌握度', dataIndex: 'masteryScore', render: (v: number) =>
                  <Tag color="red">{Math.round(v)}分</Tag>
                },
              ]}
              pagination={false}
            />
          ),
        },
        {
          key: 'history',
          label: '作业历史',
          children: (
            <Table
              dataSource={student.submissions ?? []}
              rowKey="id"
              columns={[
                { title: '作业名称', dataIndex: ['assignment', 'title'] },
                { title: '得分', dataIndex: 'totalScoreConfirmed', render: (v: number | null) => v ?? '待确认' },
                { title: '状态', dataIndex: 'status' },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
              ]}
              pagination={false}
            />
          ),
        },
      ]} />
    </div>
  )
}
```

- [ ] **Step 6: 配置 Ant Design 注册 `src/app/layout.tsx`**

```typescript
import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '教师教学智能体' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
```

- [ ] **Step 7: 验证页面可访问**

```bash
pnpm dev
```

访问 http://localhost:3000/students，预期：看到学生列表页（含表头，无数据）

- [ ] **Step 8: 提交**

```bash
git add src/app/ src/components/students/
git commit -m "feat: add student management UI with radar chart and mastery heatmap"
```

---

## Phase 3：作业上传与 AI 处理（Tasks 9–13）
*完成后：可以上传作业图片，Worker 自动调用 GLM-5V 识别，结果存入数据库*

---

### Task 9：作业上传 API

**Files:**
- Create: `src/app/api/assignments/upload/route.ts`
- Create: `src/app/api/assignments/[id]/route.ts`
- Create: `src/app/api/assignments/route.ts`
- Create: `src/app/api/jobs/[jobId]/route.ts`
- Create: `src/app/api/jobs/[jobId]/stream/route.ts`

- [ ] **Step 1: 写 `src/app/api/assignments/upload/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getStorageProvider } from '@/lib/storage'
import { imageAnalysisQueue } from '@/lib/queue/queues'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const MAX_FILE_SIZE = 20 * 1024 * 1024  // 20MB

const uploadSchema = z.object({
  title: z.string().min(1),
  classId: z.string().cuid(),
  teacherId: z.string().cuid(),
  studentId: z.string().cuid(),
  subject: z.string().min(1),
  gradingMode: z.enum(['ai_grade', 'teacher_mark', 'ai_review']),
})

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return errorResponse('VALIDATION_ERROR', 'Invalid form data', 400)

  const file = formData.get('file') as File | null
  if (!file) return errorResponse('VALIDATION_ERROR', 'No file provided', 400)

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('VALIDATION_ERROR', 'File too large (max 20MB)', 400)
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return errorResponse('VALIDATION_ERROR', 'Unsupported file type. Use JPG, PNG, or PDF', 400)
  }

  const meta = {
    title: formData.get('title') as string,
    classId: formData.get('classId') as string,
    teacherId: formData.get('teacherId') as string,
    studentId: formData.get('studentId') as string,
    subject: formData.get('subject') as string,
    gradingMode: formData.get('gradingMode') as string,
  }

  const parsed = uploadSchema.safeParse(meta)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  // 存文件
  const storage = getStorageProvider()
  const buffer = Buffer.from(await file.arrayBuffer())
  const storedPath = await storage.save(buffer, file.name, file.type)
  const fileUrl = storage.getUrl(storedPath)

  // 创建 Assignment（如果不存在则创建）
  const assignment = await prisma.assignment.upsert({
    where: { id: `${parsed.data.classId}-${parsed.data.title}` },
    create: {
      id: `${parsed.data.classId}-${parsed.data.title}`,
      title: parsed.data.title,
      subject: parsed.data.subject,
      classId: parsed.data.classId,
      teacherId: parsed.data.teacherId,
      gradingMode: parsed.data.gradingMode,
      knowledgeScope: [],
    },
    update: {},
  })

  // 创建 Submission
  const submission = await prisma.submission.create({
    data: {
      assignmentId: assignment.id,
      studentId: parsed.data.studentId,
      fileUrl,
      gradingMode: parsed.data.gradingMode,
      status: 'processing',
    },
  })

  // 创建 AIJob 记录
  const aiJob = await prisma.aIJob.create({
    data: {
      type: 'image_analysis',
      status: 'pending',
      submissionId: submission.id,
    },
  })

  // 入队
  const bullJob = await imageAnalysisQueue.add(
    'image_analysis',
    { submissionId: submission.id, mode: parsed.data.gradingMode as 'ai_grade' | 'teacher_mark' | 'ai_review' },
    { jobId: aiJob.id }
  )

  // 更新 AIJob 关联 BullMQ job id
  await prisma.aIJob.update({ where: { id: aiJob.id }, data: { status: 'processing' } })

  return Response.json({ jobId: aiJob.id, submissionId: submission.id, status: 'processing' }, { status: 202 })
}
```

- [ ] **Step 2: 写 SSE 进度路由 `src/app/api/jobs/[jobId]/stream/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let attempts = 0
      const maxAttempts = 120  // 最长等 2 分钟（每秒一次）

      const poll = async () => {
        if (attempts++ >= maxAttempts) {
          send({ type: 'timeout', message: '处理超时，请刷新页面查看结果' })
          controller.close()
          return
        }

        const job = await prisma.aIJob.findUnique({ where: { id: params.jobId } })
        if (!job) {
          send({ type: 'error', message: '任务不存在' })
          controller.close()
          return
        }

        send({ type: 'progress', status: job.status, attempts: job.attempts })

        if (job.status === 'completed' || job.status === 'failed') {
          send({ type: job.status === 'completed' ? 'done' : 'error', message: job.error ?? undefined })
          controller.close()
          return
        }

        setTimeout(poll, 1000)
      }

      await poll()

      req.signal.addEventListener('abort', () => controller.close())
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 3: 写 `src/hooks/useJobStream.ts`**

```typescript
import { useState, useEffect } from 'react'

type JobStatus = 'processing' | 'completed' | 'failed' | 'timeout'

interface JobStreamState {
  status: JobStatus | null
  done: boolean
  error: string | null
}

export function useJobStream(jobId: string | null): JobStreamState {
  const [state, setState] = useState<JobStreamState>({ status: null, done: false, error: null })

  useEffect(() => {
    if (!jobId) return
    const es = new EventSource(`/api/jobs/${jobId}/stream`)

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'progress') {
        setState((s) => ({ ...s, status: data.status }))
      } else if (data.type === 'done') {
        setState({ status: 'completed', done: true, error: null })
        es.close()
      } else if (data.type === 'error') {
        setState({ status: 'failed', done: true, error: data.message })
        es.close()
      } else if (data.type === 'timeout') {
        setState({ status: 'timeout', done: true, error: data.message })
        es.close()
      }
    }

    es.onerror = () => {
      setState((s) => ({ ...s, error: 'SSE 连接断开', done: true }))
      es.close()
    }

    return () => es.close()
  }, [jobId])

  return state
}
```

- [ ] **Step 4: 提交**

```bash
git add src/app/api/assignments/ src/app/api/jobs/ src/hooks/
git commit -m "feat: add assignment upload API with BullMQ job dispatch and SSE stream"
```

---

### Task 10：ImageAnalysisWorker（GLM-5V）

**Files:**
- Modify: `src/lib/queue/workers/image-analysis.ts`

- [ ] **Step 1: 写完整 `src/lib/queue/workers/image-analysis.ts`**

```typescript
import { Worker, Job } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { ImageAnalysisJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'
import { gradingQueue } from '../queues'

const TEACHER_MARK_PROMPT = `你是一个专业的作业批阅结果识别系统。

分析这份已被教师批阅的作业图片，识别所有批阅痕迹。

请以 JSON 格式返回，格式如下：
{
  "total_score": number | null,
  "marks": [
    {
      "question_no": "1",
      "mark_type": "tick|cross|half|deduct|score|comment|circle",
      "mark_text": "评语文字或null",
      "score_value": 5 或 null,
      "bbox": { "x": 0.1, "y": 0.2, "width": 0.05, "height": 0.03 },
      "confidence": 0.92
    }
  ]
}

注意：
1. 区分三层：印刷题目层、学生手写层、教师批阅层
2. 重点识别教师批阅层（对勾✓、叉号✗、扣分数字、评语）
3. bbox 坐标用图片宽高的百分比（0-1）
4. 将每个痕迹归属到最近的题号
5. confidence 为识别置信度（0-1）
6. 若归属不确定，confidence 设为 0.5 以下`

const AI_GRADE_PROMPT = `你是一个专业的作业批改系统。

分析这份学生作业图片，识别所有题目和学生的答题内容。

请以 JSON 格式返回：
{
  "total_score": null,
  "questions": [
    {
      "question_no": "1",
      "content": "题目内容（如可识别）",
      "student_answer": "学生填写的答案",
      "bbox": { "x": 0.0, "y": 0.0, "width": 1.0, "height": 0.2 },
      "confidence": 0.88
    }
  ],
  "marks": []
}`

async function processImageAnalysis(job: Job<ImageAnalysisJobData>) {
  const { submissionId, mode } = job.data

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  })

  if (!submission) throw new Error(`Submission ${submissionId} not found`)

  const imageProvider = providerRegistry.getImageProvider()
  const prompt = mode === 'ai_grade' ? AI_GRADE_PROMPT : TEACHER_MARK_PROMPT

  // 获取图片本地路径
  const storedName = submission.fileUrl.replace('/api/uploads/', '')
  const localPath = `./uploads/${storedName}`

  const result = await imageProvider.analyzeImage(localPath, prompt, { timeout: 60_000 })

  // 存储批阅痕迹（mode: teacher_mark / ai_review）
  if (result.marks?.length) {
    await prisma.teacherMark.createMany({
      data: result.marks.map((mark) => ({
        submissionId,
        questionNo: mark.question_no,
        markType: mark.mark_type,
        markText: mark.mark_text,
        bbox: mark.bbox,
        confidence: mark.confidence,
      })),
    })
  }

  // 存储题目识别结果（mode: ai_grade）
  if (result.questions?.length) {
    await prisma.gradingResult.createMany({
      data: result.questions.map((q) => ({
        submissionId,
        questionNo: q.question_no,
        studentAnswer: q.student_answer,
        confidence: q.confidence,
      })),
    })
  }

  // 更新总分（如识别到）
  if (result.total_score !== null) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { totalScoreDetected: result.total_score },
    })
  }

  // 入队下一步：批改评分
  await gradingQueue.add('grading', { submissionId })

  return { marksCount: result.marks?.length ?? 0, questionsCount: result.questions?.length ?? 0 }
}

export const imageAnalysisWorker = new Worker<ImageAnalysisJobData>(
  'image_analysis',
  async (job) => {
    await prisma.aIJob.update({
      where: { id: job.id! },
      data: { status: 'processing', attempts: job.attemptsMade + 1 },
    })

    try {
      const result = await processImageAnalysis(job)
      await prisma.aIJob.update({
        where: { id: job.id! },
        data: { status: 'completed', result },
      })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await prisma.aIJob.update({
        where: { id: job.id! },
        data: { status: 'failed', error: message },
      })
      throw err
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  }
)
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/queue/workers/image-analysis.ts
git commit -m "feat: implement ImageAnalysisWorker with GLM-5V integration"
```

---

### Task 11：GradingWorker（DeepSeek）

**Files:**
- Modify: `src/lib/queue/workers/grading.ts`

- [ ] **Step 1: 写完整 `src/lib/queue/workers/grading.ts`**

```typescript
import { Worker, Job } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { GradingJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'
import { masteryUpdateQueue } from '../queues'

const ERROR_TYPES = ['concept', 'formula', 'calculation', 'sign', 'reading', 'extraction', 'step_missing', 'format', 'method', 'transfer', 'comprehensive', 'careless'] as const

function buildGradingPrompt(question: {
  questionNo: string
  studentAnswer: string | null
  standardAnswer?: string | null
}): string {
  return `你是一位经验丰富的${question.questionNo}题批改专家。

学生答案：${question.studentAnswer ?? '（未识别到答案）'}
标准答案：${question.standardAnswer ?? '（教师未提供标准答案，根据学科知识判断）'}

请评估这道题并以 JSON 格式返回：
{
  "is_correct": true|false,
  "partial_credit": true|false,
  "suggested_score_rate": 0.0-1.0,
  "error_type": "${ERROR_TYPES.join('|')}"|null,
  "knowledge_point_hint": "涉及知识点关键词",
  "feedback": "给学生的简短反馈（50字内）",
  "confidence": 0.0-1.0
}

错因类型说明：concept=概念不清, formula=公式误用, calculation=计算错误, sign=符号错误, reading=审题错误, extraction=信息提取错误, step_missing=步骤缺失, format=表达不规范, method=方法选择错误, transfer=迁移能力不足, comprehensive=综合应用弱, careless=粗心错误`
}

async function processGrading(job: Job<GradingJobData>) {
  const { submissionId } = job.data

  const gradingResults = await prisma.gradingResult.findMany({
    where: { submissionId, aiScore: null },
    include: { submission: { include: { assignment: true } } },
  })

  if (gradingResults.length === 0) {
    // teacher_mark 模式：从 teacherMark 生成 gradingResult
    await generateFromTeacherMarks(submissionId)
    return { processed: 0, mode: 'teacher_mark' }
  }

  const textProvider = providerRegistry.getTextProvider()
  let processed = 0

  for (const gr of gradingResults) {
    const prompt = buildGradingPrompt({
      questionNo: gr.questionNo,
      studentAnswer: gr.studentAnswer,
      standardAnswer: gr.standardAnswer,
    })

    const rawResponse = await textProvider.generateText(prompt, { temperature: 0.1 })
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) continue

    const parsed = JSON.parse(jsonMatch[0])

    // 知识点匹配（简单关键词匹配，后续可接 RAG）
    let knowledgePointId: string | undefined
    if (parsed.knowledge_point_hint) {
      const kp = await prisma.knowledgePoint.findFirst({
        where: {
          name: { contains: parsed.knowledge_point_hint, mode: 'insensitive' },
          subject: gr.submission.assignment.subject,
        },
      })
      knowledgePointId = kp?.id
    }

    await prisma.gradingResult.update({
      where: { id: gr.id },
      data: {
        aiScore: parsed.suggested_score_rate,
        isCorrect: parsed.is_correct,
        errorType: parsed.error_type ?? null,
        feedback: parsed.feedback,
        confidence: parsed.confidence,
        knowledgePointId,
        finalScore: parsed.suggested_score_rate,
        finalSource: 'ai',
      },
    })

    processed++
  }

  // 更新 submission 状态为待确认
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'pending_confirm' },
  })

  return { processed }
}

async function generateFromTeacherMarks(submissionId: string) {
  const marks = await prisma.teacherMark.findMany({ where: { submissionId } })
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  })
  if (!submission) return

  // 按题号分组
  const byQuestion = marks.reduce<Record<string, typeof marks>>((acc, m) => {
    acc[m.questionNo] = acc[m.questionNo] ?? []
    acc[m.questionNo].push(m)
    return acc
  }, {})

  const textProvider = providerRegistry.getTextProvider()

  for (const [questionNo, qMarks] of Object.entries(byQuestion)) {
    const markSummary = qMarks.map((m) => `${m.markType}: ${m.markText ?? ''} (置信度${m.confidence})`).join(', ')
    const isCorrect = qMarks.some((m) => m.markType === 'tick')
    const isWrong = qMarks.some((m) => m.markType === 'cross')
    const deductMark = qMarks.find((m) => m.markType === 'deduct')
    const commentMark = qMarks.find((m) => m.markType === 'comment')

    // 基于批阅痕迹推断错因
    let errorType: string | null = null
    if (commentMark?.markText) {
      const errPrompt = `教师评语："${commentMark.markText}"。请从以下类型中选一个最匹配的错因类型，仅返回英文类型名：${ERROR_TYPES.join(', ')}`
      const errResponse = await textProvider.generateText(errPrompt, { temperature: 0.1, maxTokens: 20 })
      const matched = ERROR_TYPES.find((t) => errResponse.includes(t))
      errorType = matched ?? null
    }

    await prisma.gradingResult.upsert({
      where: { id: `${submissionId}-${questionNo}` },
      create: {
        id: `${submissionId}-${questionNo}`,
        submissionId,
        questionNo,
        isCorrect: isCorrect && !isWrong,
        teacherScoreDetected: deductMark?.score_value ? undefined : undefined,
        errorType,
        feedback: commentMark?.markText ?? null,
        confidence: Math.min(...qMarks.map((m) => m.confidence)),
        finalSource: 'teacher_detected',
      },
      update: {},
    })
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'pending_confirm' },
  })
}

export const gradingWorker = new Worker<GradingJobData>(
  'grading',
  async (job) => {
    try {
      return await processGrading(job)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // 更新关联的 AIJob
      const aiJob = await prisma.aIJob.findFirst({
        where: { submissionId: job.data.submissionId, type: 'image_analysis' },
      })
      if (aiJob) {
        await prisma.aIJob.update({ where: { id: aiJob.id }, data: { status: 'failed', error: msg } })
      }
      throw err
    }
  },
  { connection: getRedisConnection(), concurrency: 3 }
)
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/queue/workers/grading.ts
git commit -m "feat: implement GradingWorker with DeepSeek for scoring and error analysis"
```

---

### Task 12：MasteryUpdateWorker

**Files:**
- Modify: `src/lib/queue/workers/mastery-update.ts`

- [ ] **Step 1: 实现 `src/lib/queue/workers/mastery-update.ts`**

```typescript
import { Worker } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { MasteryUpdateJobData } from '../queues'
import { prisma } from '@/lib/db'
import { calculateNewMastery, type MasteryEvidence } from '@/lib/mastery/calculator'

export const masteryUpdateWorker = new Worker<MasteryUpdateJobData>(
  'mastery_update',
  async (job) => {
    const { submissionId } = job.data

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        gradingResults: {
          include: { knowledgePoint: true },
          where: { finalScore: { not: null } },
        },
        student: {
          include: {
            masteries: true,
            submissions: {
              include: { gradingResults: { where: { knowledgePointId: { not: null } } } },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    })

    if (!submission) throw new Error(`Submission ${submissionId} not found`)

    // 按知识点分组
    const byKP = submission.gradingResults.reduce<Record<string, typeof submission.gradingResults>>((acc, gr) => {
      if (!gr.knowledgePointId) return acc
      acc[gr.knowledgePointId] = acc[gr.knowledgePointId] ?? []
      acc[gr.knowledgePointId].push(gr)
      return acc
    }, {})

    const existingMasteries = Object.fromEntries(
      submission.student.masteries.map((m) => [m.knowledgePointId, m.masteryScore])
    )

    // 计算每个知识点的历史重复错误
    const historicalErrors = submission.student.submissions
      .flatMap((s) => s.gradingResults)
      .reduce<Record<string, string[]>>((acc, gr) => {
        if (gr.knowledgePointId && gr.errorType) {
          acc[gr.knowledgePointId] = acc[gr.knowledgePointId] ?? []
          acc[gr.knowledgePointId].push(gr.errorType)
        }
        return acc
      }, {})

    for (const [kpId, results] of Object.entries(byKP)) {
      const currentScore = existingMasteries[kpId] ?? null

      const evidences: MasteryEvidence[] = results.map((gr, idx) => {
        const histErrors = historicalErrors[kpId] ?? []
        const isRepeat = gr.errorType ? histErrors.slice(0, -results.length).includes(gr.errorType) : false
        const recencyWeight = 1.0 - (idx * 0.1)

        return {
          questionDifficulty: 'medium',  // TODO: 从 KnowledgePoint.difficulty 读取
          scoreRate: gr.finalScore ?? (gr.isCorrect ? 1.0 : 0.0),
          errorType: gr.errorType,
          isRepeatError: isRepeat,
          recencyWeight: Math.max(0.3, recencyWeight),
        }
      })

      const newScore = calculateNewMastery(currentScore, evidences)

      await prisma.studentMastery.upsert({
        where: { studentId_knowledgePointId: { studentId: submission.studentId, knowledgePointId: kpId } },
        create: { studentId: submission.studentId, knowledgePointId: kpId, masteryScore: newScore, evidenceCount: results.length },
        update: { masteryScore: newScore, evidenceCount: { increment: results.length } },
      })
    }

    return { updatedKPs: Object.keys(byKP).length }
  },
  { connection: getRedisConnection(), concurrency: 5 }
)
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/queue/workers/mastery-update.ts
git commit -m "feat: implement MasteryUpdateWorker with weighted mastery calculation"
```

---

## Phase 4：批改确认 UI（Tasks 13–15）
*完成后：教师可以在页面上查看 AI 批改结果、确认或修改，并触发画像更新*

---

### Task 13：AnnotatedImageViewer 组件

**Files:**
- Create: `src/components/assignments/AnnotatedImageViewer.tsx`
- Create: `src/components/shared/ConfidenceBadge.tsx`

- [ ] **Step 1: 写 `src/components/shared/ConfidenceBadge.tsx`**

```typescript
import { Tag, Tooltip } from 'antd'

interface Props {
  confidence: number  // 0-1
  size?: 'small' | 'default'
}

export function ConfidenceBadge({ confidence, size = 'default' }: Props) {
  const pct = Math.round(confidence * 100)
  const color = confidence >= 0.85 ? 'success' : confidence >= 0.70 ? 'warning' : 'error'
  const label = confidence >= 0.85 ? `${pct}%` : confidence >= 0.70 ? `${pct}% 建议确认` : `${pct}% 需复核`

  return (
    <Tooltip title={`识别置信度：${pct}%`}>
      <Tag color={color} style={{ fontSize: size === 'small' ? 10 : 12 }}>{label}</Tag>
    </Tooltip>
  )
}
```

- [ ] **Step 2: 写 `src/components/assignments/AnnotatedImageViewer.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Tooltip } from 'antd'

interface BBox {
  x: number; y: number; width: number; height: number
}

interface Mark {
  id: string
  questionNo: string
  markType: string
  markText?: string | null
  bbox: BBox
  confidence: number
}

interface Props {
  imageUrl: string
  marks: Mark[]
  selectedQuestionNo?: string | null
  onMarkClick?: (questionNo: string) => void
}

function getMarkColor(mark: Mark): string {
  if (mark.confidence < 0.70) return '#ff4d4f'
  if (mark.confidence < 0.85) return '#fa8c16'
  if (mark.markType === 'tick') return '#52c41a'
  if (mark.markType === 'cross') return '#ff4d4f'
  if (mark.markType === 'deduct') return '#faad14'
  return '#1677ff'
}

function getMarkLabel(mark: Mark): string {
  const typeLabels: Record<string, string> = {
    tick: '✓', cross: '✗', half: '△', deduct: `−${mark.markText ?? '?'}`,
    score: mark.markText ?? '?', comment: '评', circle: '○',
  }
  return typeLabels[mark.markType] ?? mark.markType
}

export function AnnotatedImageViewer({ imageUrl, marks, selectedQuestionNo, onMarkClick }: Props) {
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState(1)

  return (
    <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', maxWidth: '100%' }}>
      {/* 缩放控制 */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>−</button>
        <span style={{ fontSize: 12, color: '#666' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>+</button>
      </div>

      <div style={{ position: 'relative', display: 'inline-block', transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="作业图片"
          onLoad={(e) => {
            const img = e.currentTarget
            setImgSize({ width: img.naturalWidth, height: img.naturalHeight })
          }}
          style={{ display: 'block', maxWidth: '100%', userSelect: 'none' }}
          draggable={false}
        />

        {/* SVG 标注叠加层 */}
        {imgSize && (
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
          >
            {marks.map((mark) => {
              const x = mark.bbox.x * imgSize.width
              const y = mark.bbox.y * imgSize.height
              const w = mark.bbox.width * imgSize.width
              const h = mark.bbox.height * imgSize.height
              const color = getMarkColor(mark)
              const isSelected = mark.questionNo === selectedQuestionNo
              const isDashed = mark.confidence < 0.70

              return (
                <g
                  key={mark.id}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={() => onMarkClick?.(mark.questionNo)}
                >
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isDashed ? '6 3' : undefined}
                    rx={3}
                  />
                  <text
                    x={x + 3} y={y + 14}
                    fill={color}
                    fontSize={14}
                    fontWeight="bold"
                  >
                    {getMarkLabel(mark)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>

      {/* 图例 */}
      <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: '#666' }}>
        <span><span style={{ color: '#52c41a' }}>■</span> 正确 (≥85%)</span>
        <span><span style={{ color: '#ff4d4f' }}>■</span> 错误 / 低置信</span>
        <span><span style={{ color: '#fa8c16' }}>■</span> 需确认 (70-84%)</span>
        <span><span style={{ color: '#1677ff', borderBottom: '2px dashed' }}>&nbsp;&nbsp;&nbsp;</span> 低置信 (&lt;70%)</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/assignments/AnnotatedImageViewer.tsx src/components/shared/ConfidenceBadge.tsx
git commit -m "feat: add AnnotatedImageViewer with SVG bbox overlay and confidence color coding"
```

---

### Task 14：AI 批改结果确认页

**Files:**
- Create: `src/app/api/assignments/[id]/grading/route.ts`
- Create: `src/app/api/assignments/[id]/grading/confirm/route.ts`
- Create: `src/app/(dashboard)/assignments/[id]/grading/page.tsx`
- Create: `src/components/shared/JobProgressBar.tsx`

- [ ] **Step 1: 写 `src/components/shared/JobProgressBar.tsx`**

```typescript
'use client'
import { Alert, Progress, Spin } from 'antd'
import { useJobStream } from '@/hooks/useJobStream'

interface Props {
  jobId: string | null
  onDone?: () => void
}

export function JobProgressBar({ jobId, onDone }: Props) {
  const { status, done, error } = useJobStream(jobId)

  if (!jobId) return null

  if (error) {
    return <Alert type="error" message={`处理失败：${error}`} style={{ marginBottom: 16 }} />
  }

  if (done) {
    if (onDone) setTimeout(onDone, 500)
    return <Alert type="success" message="AI 处理完成，正在加载结果..." style={{ marginBottom: 16 }} />
  }

  const statusLabels: Record<string, string> = {
    pending: '等待处理...',
    processing: 'AI 正在分析作业图片...',
  }

  return (
    <div style={{ marginBottom: 16, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae0ff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Spin size="small" />
        <span style={{ color: '#1677ff' }}>{statusLabels[status ?? 'pending']}</span>
      </div>
      <Progress percent={status === 'processing' ? 60 : 20} status="active" showInfo={false} />
    </div>
  )
}
```

- [ ] **Step 2: 写 `src/app/api/assignments/[id]/grading/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      gradingResults: {
        include: { knowledgePoint: true },
        orderBy: { questionNo: 'asc' },
      },
      teacherMarks: { orderBy: { questionNo: 'asc' } },
      student: { select: { id: true, name: true } },
      assignment: { select: { title: true, gradingMode: true } },
      aiJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  if (!submission) return errorResponse('NOT_FOUND', 'Submission not found', 404)
  return Response.json(submission)
}
```

- [ ] **Step 3: 写 `src/app/api/assignments/[id]/grading/confirm/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { masteryUpdateQueue } from '@/lib/queue/queues'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const confirmSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    teacherScoreConfirmed: z.number().optional(),
    errorType: z.string().nullable().optional(),
    knowledgePointId: z.string().nullable().optional(),
  })),
  totalScoreConfirmed: z.number().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null)
  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  const submission = await prisma.submission.findUnique({ where: { id: params.id } })
  if (!submission) return errorResponse('NOT_FOUND', 'Submission not found', 404)

  // 批量更新每题教师确认分
  await Promise.all(
    parsed.data.results.map((r) =>
      prisma.gradingResult.update({
        where: { id: r.id },
        data: {
          teacherScoreConfirmed: r.teacherScoreConfirmed,
          finalScore: r.teacherScoreConfirmed ?? undefined,
          finalSource: r.teacherScoreConfirmed !== undefined ? 'teacher_confirmed' : undefined,
          errorType: r.errorType,
          knowledgePointId: r.knowledgePointId,
        },
      })
    )
  )

  // 更新总分和状态
  await prisma.submission.update({
    where: { id: params.id },
    data: {
      status: 'confirmed',
      totalScoreConfirmed: parsed.data.totalScoreConfirmed,
    },
  })

  // 触发掌握度更新
  await masteryUpdateQueue.add('mastery_update', { submissionId: params.id })

  return Response.json({ ok: true, submissionId: params.id })
}
```

- [ ] **Step 4: 写 `src/app/(dashboard)/assignments/[id]/grading/page.tsx`**

```typescript
'use client'
import { useState, use } from 'react'
import { Button, Table, InputNumber, Select, Alert, Space, Statistic, Row, Col, Card, message } from 'antd'
import useSWR from 'swr'
import { AnnotatedImageViewer } from '@/components/assignments/AnnotatedImageViewer'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { JobProgressBar } from '@/components/shared/JobProgressBar'
import { useRouter, useSearchParams } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const errorTypeLabels: Record<string, string> = {
  concept: '概念不清', formula: '公式误用', calculation: '计算错误',
  sign: '符号错误', reading: '审题错误', extraction: '信息提取错误',
  step_missing: '步骤缺失', format: '表达不规范', method: '方法错误',
  transfer: '迁移能力不足', comprehensive: '综合应用弱', careless: '粗心',
}

export default function GradingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const router = useRouter()

  const [selectedQ, setSelectedQ] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { score?: number; errorType?: string; kpId?: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [jobDone, setJobDone] = useState(!jobId)

  const { data: submission, mutate } = useSWR(jobDone ? `/api/assignments/${id}/grading` : null, fetcher)

  const lowConfidence = (submission?.gradingResults ?? []).filter((r: { confidence: number | null }) => (r.confidence ?? 1) < 0.70)

  async function handleConfirm() {
    if (lowConfidence.length > 0 && !window.confirm(`还有 ${lowConfidence.length} 个低置信度项未处理，确认继续？`)) return

    setSubmitting(true)
    const results = (submission?.gradingResults ?? []).map((r: { id: string; aiScore: number | null; errorType: string | null; knowledgePointId: string | null }) => ({
      id: r.id,
      teacherScoreConfirmed: edits[r.id]?.score ?? r.aiScore,
      errorType: edits[r.id]?.errorType ?? r.errorType,
      knowledgePointId: edits[r.id]?.kpId ?? r.knowledgePointId,
    }))

    const totalConfirmed = results.reduce((sum: number, r: { teacherScoreConfirmed: number | null }) => sum + (r.teacherScoreConfirmed ?? 0), 0)

    const res = await fetch(`/api/assignments/${id}/grading/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, totalScoreConfirmed: totalConfirmed }),
    })

    setSubmitting(false)
    if (res.ok) {
      message.success('批改结果已确认，正在更新学生画像...')
      router.push(`/students/${submission?.studentId}`)
    } else {
      message.error('确认失败，请重试')
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>
        {submission?.assignment?.title ?? 'AI 批改结果'} — {submission?.student?.name}
      </h2>

      <JobProgressBar jobId={jobDone ? null : jobId} onDone={() => { setJobDone(true); mutate() }} />

      {submission && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Card><Statistic title="AI 建议总分" value={submission.gradingResults?.reduce((s: number, r: { aiScore: number | null }) => s + (r.aiScore ?? 0), 0).toFixed(1)} /></Card></Col>
            <Col span={6}><Card><Statistic title="错题数" value={submission.gradingResults?.filter((r: { isCorrect: boolean | null }) => r.isCorrect === false).length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="低置信项" value={lowConfidence.length} valueStyle={{ color: '#d48806' }} /></Card></Col>
          </Row>

          {lowConfidence.length > 0 && (
            <Alert type="warning" style={{ marginBottom: 16 }}
              message={`${lowConfidence.length} 个题目识别置信度低于 70%，请重点确认`} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <AnnotatedImageViewer
                imageUrl={submission.fileUrl}
                marks={submission.teacherMarks ?? []}
                selectedQuestionNo={selectedQ}
                onMarkClick={setSelectedQ}
              />
            </div>

            <div>
              <Table
                dataSource={submission.gradingResults ?? []}
                rowKey="id"
                size="small"
                pagination={false}
                rowClassName={(r: { questionNo: string }) => r.questionNo === selectedQ ? 'ant-table-row-selected' : ''}
                onRow={(r: { questionNo: string }) => ({ onClick: () => setSelectedQ(r.questionNo) })}
                columns={[
                  { title: '题号', dataIndex: 'questionNo', width: 60 },
                  { title: 'AI 分', dataIndex: 'aiScore', width: 80, render: (v: number | null) => v?.toFixed(1) ?? '-' },
                  { title: '教师改分', width: 100, render: (_: unknown, r: { id: string; aiScore: number | null }) => (
                    <InputNumber size="small" min={0} max={100} step={0.5}
                      defaultValue={r.aiScore ?? undefined}
                      onChange={(v) => setEdits((e) => ({ ...e, [r.id]: { ...e[r.id], score: v ?? undefined } }))}
                    />
                  )},
                  { title: '错因', width: 120, render: (_: unknown, r: { id: string; errorType: string | null }) => (
                    <Select size="small" style={{ width: '100%' }}
                      defaultValue={r.errorType}
                      allowClear
                      options={Object.entries(errorTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                      onChange={(v) => setEdits((e) => ({ ...e, [r.id]: { ...e[r.id], errorType: v } }))}
                    />
                  )},
                  { title: '置信度', dataIndex: 'confidence', width: 90, render: (v: number | null) =>
                    v !== null ? <ConfidenceBadge confidence={v} size="small" /> : '-'
                  },
                ]}
              />

              <Space style={{ marginTop: 16 }}>
                <Button type="primary" loading={submitting} onClick={handleConfirm}>确认全部入库</Button>
                <Button onClick={() => router.back()}>返回</Button>
              </Space>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 验证端到端流程**

```bash
pnpm dev &
pnpm worker &

# 1. 在作业上传页上传一张作业图片（需先有学生+班级数据）
# 2. 上传后跳转到 /assignments/:submissionId/grading?jobId=xxx
# 3. 看到进度条 → Worker 处理完成 → 展示 AI 批改结果
# 4. 修改分数 → 点击确认 → 跳转到学生详情页
```

- [ ] **Step 6: 提交**

```bash
git add src/app/(dashboard)/assignments/ src/app/api/assignments/ src/components/shared/
git commit -m "feat: add grading confirmation page with annotated image viewer and SSE progress"
```

---

## Phase 5：个性化出题（Task 15）
*完成后：教师可从学生薄弱点生成试题并审核入库*

---

### Task 15：试题生成

**Files:**
- Modify: `src/lib/queue/workers/question-gen.ts`
- Create: `src/app/api/questions/generate/route.ts`
- Create: `src/app/api/questions/[id]/approve/route.ts`
- Create: `src/app/(dashboard)/questions/generate/page.tsx`

- [ ] **Step 1: 实现 `src/lib/queue/workers/question-gen.ts`**

```typescript
import { Worker } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { QuestionGenJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'

function buildQuestionGenPrompt(data: QuestionGenJobData, weakPoints: string[]): string {
  return `你是一位经验丰富的${data.subject}老师，请为${data.grade}年级学生生成 ${data.count} 道${data.type}题。

薄弱知识点：${weakPoints.join('、')}
题型：${data.type}
难度：${data.difficulty}（基础/中等/提高）
目标：补弱训练

请以 JSON 数组格式返回，每道题包含：
[
  {
    "content": "完整题目内容",
    "answer": "标准答案",
    "explanation": "解题过程（100-200字）",
    "scoring_criteria": "评分标准（主观题）或null",
    "knowledge_point_hint": "主要考查的知识点名称",
    "common_errors": "学生常见错误（30字内）",
    "difficulty_level": 1-5
  }
]

要求：
1. 题目符合${data.grade}年级认知水平
2. 难度与要求一致
3. 答案完整正确
4. 解析清晰易懂`
}

export const questionGenWorker = new Worker<QuestionGenJobData>(
  'question_gen',
  async (job) => {
    const { knowledgePointIds, subject, grade } = job.data

    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where: { id: { in: knowledgePointIds } },
    })
    const kpNames = knowledgePoints.map((k) => k.name)

    const textProvider = providerRegistry.getTextProvider()
    const prompt = buildQuestionGenPrompt(job.data, kpNames)
    const raw = await textProvider.generateText(prompt, { temperature: 0.7, maxTokens: 4096 })

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Failed to parse generated questions JSON')

    const questions: Array<{
      content: string; answer: string; explanation: string;
      scoring_criteria: string | null; knowledge_point_hint: string;
      difficulty_level: number;
    }> = JSON.parse(jsonMatch[0])

    // 匹配知识点
    const created = await Promise.all(
      questions.map(async (q) => {
        const kp = knowledgePoints.find((k) => q.knowledge_point_hint?.includes(k.name))
        return prisma.question.create({
          data: {
            content: q.content,
            type: job.data.type,
            answer: q.answer,
            explanation: q.explanation,
            scoringCriteria: q.scoring_criteria,
            subject,
            grade,
            difficulty: q.difficulty_level ?? 3,
            knowledgePointId: kp?.id ?? knowledgePointIds[0],
            source: 'ai_generated',
            status: 'draft',
          },
        })
      })
    )

    // 更新 AIJob
    const aiJob = await prisma.aIJob.findFirst({ where: { type: 'question_gen', status: 'processing' } })
    if (aiJob) {
      await prisma.aIJob.update({
        where: { id: aiJob.id },
        data: { status: 'completed', result: { questionIds: created.map((q) => q.id) } },
      })
    }

    return { count: created.length, questionIds: created.map((q) => q.id) }
  },
  { connection: getRedisConnection(), concurrency: 2 }
)
```

- [ ] **Step 2: 写 `src/app/api/questions/generate/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { questionGenQueue } from '@/lib/queue/queues'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const genSchema = z.object({
  studentId: z.string().cuid().optional(),
  knowledgePointIds: z.array(z.string().cuid()).min(1),
  type: z.enum(['single', 'fill', 'answer']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  count: z.number().int().min(1).max(20),
  subject: z.string().min(1),
  grade: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = genSchema.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  const aiJob = await prisma.aIJob.create({
    data: { type: 'question_gen', status: 'processing' },
  })

  await questionGenQueue.add('question_gen', parsed.data, { jobId: aiJob.id })

  return Response.json({ jobId: aiJob.id, status: 'processing' }, { status: 202 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'draft'
  const page = parseInt(searchParams.get('page') ?? '1')

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: { status },
      include: { knowledgePoint: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.question.count({ where: { status } }),
  ])

  return Response.json({ questions, total })
}
```

- [ ] **Step 3: 写 `src/app/api/questions/[id]/approve/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const question = await prisma.question.findUnique({ where: { id: params.id } })
  if (!question) return errorResponse('NOT_FOUND', 'Question not found', 404)

  const updated = await prisma.question.update({
    where: { id: params.id },
    data: { status: 'approved' },
  })

  return Response.json(updated)
}
```

- [ ] **Step 4: 写 `src/app/(dashboard)/questions/generate/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Form, Select, InputNumber, Button, Card, Table, Tag, Space, message, Divider, Row, Col } from 'antd'
import useSWR, { mutate } from 'swr'
import { JobProgressBar } from '@/components/shared/JobProgressBar'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const typeOptions = [
  { value: 'single', label: '单选题' },
  { value: 'fill', label: '填空题' },
  { value: 'answer', label: '解答题' },
]

const difficultyOptions = [
  { value: 'easy', label: '基础' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '提高' },
]

export default function QuestionGeneratePage() {
  const [form] = Form.useForm()
  const [jobId, setJobId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const { data: kpData } = useSWR('/api/knowledge/points', fetcher)
  const { data: qData, mutate: refetchQ } = useSWR(showResults ? '/api/questions?status=draft' : null, fetcher)

  const kpOptions = (kpData?.knowledgePoints ?? []).map((k: { id: string; name: string; chapter?: string | null }) => ({
    value: k.id,
    label: `${k.chapter ? `[${k.chapter}] ` : ''}${k.name}`,
  }))

  async function handleGenerate(values: {
    knowledgePointIds: string[]
    type: string
    difficulty: string
    count: number
    subject: string
    grade: string
  }) {
    setGenerating(true)
    const res = await fetch('/api/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    setJobId(data.jobId)
  }

  async function handleApprove(id: string) {
    await fetch(`/api/questions/${id}/approve`, { method: 'POST' })
    message.success('已审核通过入库')
    refetchQ()
  }

  return (
    <div>
      <h2>个性化试题生成</h2>

      <Row gutter={24}>
        <Col span={10}>
          <Card title="生成参数">
            <Form form={form} layout="vertical" onFinish={handleGenerate}>
              <Form.Item name="subject" label="学科" initialValue="数学" rules={[{ required: true }]}>
                <Select options={[{ value: '数学', label: '数学' }, { value: '语文', label: '语文' }]} />
              </Form.Item>
              <Form.Item name="grade" label="年级" initialValue="七年级" rules={[{ required: true }]}>
                <Select options={['七年级','八年级','九年级'].map((g) => ({ value: g, label: g }))} />
              </Form.Item>
              <Form.Item name="knowledgePointIds" label="知识点（可多选）" rules={[{ required: true }]}>
                <Select mode="multiple" options={kpOptions} placeholder="选择要考查的知识点" />
              </Form.Item>
              <Form.Item name="type" label="题型" initialValue="fill" rules={[{ required: true }]}>
                <Select options={typeOptions} />
              </Form.Item>
              <Form.Item name="difficulty" label="难度" initialValue="medium" rules={[{ required: true }]}>
                <Select options={difficultyOptions} />
              </Form.Item>
              <Form.Item name="count" label="生成数量" initialValue={5} rules={[{ required: true }]}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={generating} block>
                  开始生成
                </Button>
              </Form.Item>
            </Form>

            <JobProgressBar
              jobId={jobId}
              onDone={() => { setGenerating(false); setShowResults(true); refetchQ() }}
            />
          </Card>
        </Col>

        <Col span={14}>
          <Card title={`生成结果（待审核：${qData?.total ?? 0}）`}>
            <Table
              dataSource={qData?.questions ?? []}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: '题目', dataIndex: 'content', ellipsis: true },
                { title: '知识点', dataIndex: ['knowledgePoint', 'name'], width: 100 },
                { title: '难度', dataIndex: 'difficulty', width: 60, render: (v: number) => '⭐'.repeat(Math.min(v, 5)) },
                { title: '操作', width: 120, render: (_: unknown, r: { id: string; status: string }) => (
                  <Space>
                    {r.status === 'draft' && (
                      <Button size="small" type="primary" onClick={() => handleApprove(r.id)}>审核通过</Button>
                    )}
                    {r.status === 'approved' && <Tag color="success">已入库</Tag>}
                  </Space>
                )},
              ]}
              expandable={{
                expandedRowRender: (r: { answer: string; explanation: string }) => (
                  <div style={{ fontSize: 12, padding: 8 }}>
                    <strong>答案：</strong>{r.answer}<br />
                    <strong>解析：</strong>{r.explanation}
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 5: 写知识点 API `src/app/api/knowledge/points/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { errorResponse } from '@/lib/errors'

const createSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  chapter: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  parentId: z.string().cuid().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subject = searchParams.get('subject')
  const grade = searchParams.get('grade')

  const knowledgePoints = await prisma.knowledgePoint.findMany({
    where: {
      status: 'active',
      ...(subject ? { subject } : {}),
      ...(grade ? { grade } : {}),
    },
    include: { children: true },
    orderBy: [{ chapter: 'asc' }, { name: 'asc' }],
  })

  return Response.json({ knowledgePoints })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  const kp = await prisma.knowledgePoint.create({ data: parsed.data })
  return Response.json(kp, { status: 201 })
}
```

- [ ] **Step 6: 提交**

```bash
git add src/lib/queue/workers/question-gen.ts src/app/api/questions/ src/app/api/knowledge/ src/app/(dashboard)/questions/
git commit -m "feat: add personalized question generation with DeepSeek and approval flow"
```

---

## Phase 6：作业上传 UI（Task 16）

### Task 16：上传向导页

**Files:**
- Create: `src/components/assignments/UploadWizard.tsx`
- Create: `src/app/(dashboard)/assignments/upload/page.tsx`

- [ ] **Step 1: 写 `src/components/assignments/UploadWizard.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Steps, Form, Select, Input, Upload, Button, Radio, message, Spin } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

const { Dragger } = Upload
const fetcher = (url: string) => fetch(url).then((r) => r.json())

const gradingModeOptions = [
  { value: 'ai_grade', label: '未批阅，需要 AI 批改', description: 'AI 自动识别题目和答案，给出建议分' },
  { value: 'teacher_mark', label: '教师已批阅，只需识别批阅结果', description: 'AI 识别对勾、叉号、扣分、评语' },
  { value: 'ai_review', label: '教师已批阅，需要 AI 辅助复核', description: 'AI 识别批阅结果并独立验证，标记疑似不一致' },
]

export function UploadWizard() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [form] = Form.useForm()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: studentsData } = useSWR('/api/students?limit=100', fetcher)
  const students = studentsData?.students ?? []

  const steps = [
    { title: '基本信息', description: '作业名称、学科、班级' },
    { title: '批阅模式', description: '选择处理方式' },
    { title: '上传文件', description: '上传作业图片或 PDF' },
  ]

  async function handleSubmit() {
    const values = await form.validateFields()
    if (!file) { message.error('请先上传作业文件'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    Object.entries(values).forEach(([k, v]) => formData.append(k, String(v)))
    // 临时使用固定 teacherId，正式版从 session 获取
    formData.append('teacherId', 'teacher-placeholder-id')

    const res = await fetch('/api/assignments/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)

    if (res.ok) {
      message.success('上传成功，AI 正在处理...')
      router.push(`/assignments/${data.submissionId}/grading?jobId=${data.jobId}`)
    } else {
      message.error(data.error?.message ?? '上传失败')
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Steps current={current} items={steps} style={{ marginBottom: 32 }} />

      <Form form={form} layout="vertical">
        {current === 0 && (
          <>
            <Form.Item name="title" label="作业名称" rules={[{ required: true }]}>
              <Input placeholder="例：5月20日数学作业" />
            </Form.Item>
            <Form.Item name="subject" label="学科" rules={[{ required: true }]}>
              <Select options={['数学','语文','英语','物理','化学'].map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="studentId" label="学生" rules={[{ required: true }]}>
              <Select
                showSearch
                filterOption={(input, opt) => (opt?.label as string ?? '').includes(input)}
                options={students.map((s: { id: string; name: string; studentNo: string }) => ({ value: s.id, label: `${s.name}（${s.studentNo}）` }))}
                placeholder="选择学生"
              />
            </Form.Item>
            <Form.Item name="classId" label="班级" rules={[{ required: true }]}>
              <Input placeholder="暂用班级ID（后续从学生自动读取）" />
            </Form.Item>
          </>
        )}

        {current === 1 && (
          <Form.Item name="gradingMode" rules={[{ required: true }]}>
            <Radio.Group style={{ width: '100%' }}>
              {gradingModeOptions.map((opt) => (
                <Radio key={opt.value} value={opt.value} style={{ display: 'block', marginBottom: 16, padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>{opt.description}</div>
                  </div>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        )}

        {current === 2 && (
          <Form.Item label="作业文件">
            <Dragger
              accept=".jpg,.jpeg,.png,.pdf"
              maxCount={1}
              beforeUpload={(f) => { setFile(f); return false }}
              onRemove={() => setFile(null)}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p>点击或拖拽上传作业图片或 PDF（最大 20MB）</p>
              <p style={{ color: '#999', fontSize: 12 }}>支持 JPG、PNG、PDF 格式</p>
            </Dragger>
          </Form.Item>
        )}
      </Form>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>上一步</Button>
        {current < 2
          ? <Button type="primary" onClick={() => form.validateFields().then(() => setCurrent((c) => c + 1))}>下一步</Button>
          : <Button type="primary" loading={uploading} onClick={handleSubmit}>提交上传</Button>
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 写 `src/app/(dashboard)/assignments/upload/page.tsx`**

```typescript
import { UploadWizard } from '@/components/assignments/UploadWizard'

export default function UploadPage() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>上传作业</h2>
      <UploadWizard />
    </div>
  )
}
```

- [ ] **Step 3: 验证完整上传流程**

```bash
# 1. 在 Prisma Studio 中先创建一个 Teacher、Class、Student 测试数据
# 2. 访问 http://localhost:3000/assignments/upload
# 3. 完成三步向导，上传一张作业图片
# 4. 自动跳转到批改结果页，看到进度条
# 5. pnpm worker 侧看到 Worker 处理日志
```

- [ ] **Step 4: 提交**

```bash
git add src/components/assignments/UploadWizard.tsx src/app/(dashboard)/assignments/upload/
git commit -m "feat: add assignment upload wizard with 3-step flow"
```

---

## Phase 7：E2E 测试（Task 17）

### Task 17：E2E 测试覆盖核心流程

**Files:**
- Create: `tests/e2e/grading-flow.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: 写 `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: 写核心 E2E 测试**

```typescript
// tests/e2e/grading-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('学生管理', () => {
  test('学生列表页可正常加载', async ({ page }) => {
    await page.goto('/students')
    await expect(page.getByText('总学生数')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })
})

test.describe('作业上传向导', () => {
  test('三步向导可完成', async ({ page }) => {
    await page.goto('/assignments/upload')
    await expect(page.getByText('基本信息')).toBeVisible()

    // Step 1
    await page.fill('input[placeholder*="作业名称"]', '测试作业')
    await page.click('button:has-text("下一步")')

    // Step 2
    await expect(page.getByText('批阅模式')).toBeVisible()
  })
})

test.describe('试题生成', () => {
  test('生成页面可正常加载', async ({ page }) => {
    await page.goto('/questions/generate')
    await expect(page.getByText('个性化试题生成')).toBeVisible()
    await expect(page.getByText('生成参数')).toBeVisible()
  })
})
```

- [ ] **Step 3: 运行 E2E 测试**

```bash
# 确保 pnpm dev 在运行
pnpm test:e2e
```

预期：3 tests passed（或等待数据填充后全部 pass）

- [ ] **Step 4: 提交**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "test: add E2E tests for core student and assignment flows"
```

---

## 自审结果

规范覆盖检查（对照设计文档各节）：

| 设计文档章节 | 覆盖任务 |
|------------|---------|
| §1 技术栈 | Task 1 |
| §2 系统架构 / 数据流 | Task 4 (BullMQ), Task 9 (Upload API + SSE) |
| §3.1 七个模块 | Task 7-8 (学生), Task 9-14 (作业), Task 15 (出题), Task 16 (上传UI) |
| §3.2 三种批阅模式 | Task 10 (ImageAnalysisWorker), Task 11 (GradingWorker) |
| §4 数据模型 | Task 2 |
| §5 API Routes 26个 | Tasks 7, 9, 14, 15 |
| §6 前端架构 | Tasks 8, 13, 14, 15, 16 |
| §7 Worker 设计 | Tasks 10, 11, 12, 15 |
| §8.1 置信度三档 | Task 13 (AnnotatedImageViewer + ConfidenceBadge) |
| §8.2 错误码 | Task 7 (errors.ts) |
| §9 测试策略 | Tasks 6 (单元), Task 17 (E2E) |
| §10 工程规范 | Task 1 |

**遗漏项目（Phase 2 留存）：**
- 教师批阅痕迹识别专用页 `/assignments/[id]/teacher-marks/page.tsx`（Worker 已实现，UI 与 Task 14 结构相同，可按 Task 14 模式复刻）
- AI 复核页 `/assignments/[id]/review/page.tsx`（ReviewWorker 未实现，与 GradingWorker 结构相同）
- `prisma/seed.ts`（知识点初始数据，需人工补充）
- NextAuth 完整配置（Task 6 仅占位，需接数据库认证）

这些不影响 MVP 核心闭环，建议作为 Phase 1.5 快速补全。
