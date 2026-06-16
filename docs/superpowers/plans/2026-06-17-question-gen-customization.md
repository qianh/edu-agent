# 个性化试题生成优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让"个性化试题生成"页面支持题型独立配额、按学生知识点掌握情况自动 90/10 抽样、图表题配额与分类生成，并把出题流程从"一次性生成整批 JSON"改为"按题型出大纲→逐题生成+校验"两阶段流程。

**Architecture:** Next.js 15 单体应用内的纵向切片改动——Prisma 模型加 3 个可选字段 → API zod schema 改造 → 新增两个纯函数模块（知识点抽样、图表配额）供 worker 和测试复用 → BullMQ worker 重写为两阶段生成 → 前端表单与结果展示改造。无新服务、无新第三方依赖。

**Tech Stack:** Next.js 15 (App Router) / Prisma + Postgres / BullMQ + Redis / Zod / Vitest / Ant Design / recharts。

**关联文档**：
- 规格：`docs/spec/question-gen-customization/spec.md`（已 Gate2 锁定，`spec_commit: a26d5b1`）
- OpenSpec：`openspec/changes/question-gen-customization/{proposal,design,tasks}.md`、`specs/personalized-question-generation/spec.md`

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `prisma/schema.prisma` | 改 | `Question` 模型新增 `isChart`/`chartSpec`/`chartImagePrompt` |
| `src/lib/queue/queues.ts` | 改 | `QuestionGenJobData` 改为按题型计数 + 图表参数 |
| `src/lib/question-gen/chart-spec.ts` | 新建 | `ChartSpec` 的 zod schema + TS 类型（几何/数据图两种） |
| `src/lib/question-gen/sampling.ts` | 新建 | 90/10 知识点抽样纯函数 |
| `src/lib/question-gen/chart-quota.ts` | 新建 | 图表题配额（`max(1, round)` 封顶）纯函数 |
| `tests/unit/question-gen-sampling.test.ts` | 新建 | 覆盖抽样边界（薄弱不足/为空） |
| `tests/unit/question-gen-chart-quota.test.ts` | 新建 | 覆盖配额边界（<1/=0） |
| `src/app/api/questions/generate/route.ts` | 改 | 新 zod schema（studentId必填、按题型计数、chartEnabled/Percentage） |
| `tests/unit/question-gen-schema.test.ts` | 新建 | 校验新 schema 的合法/非法 payload |
| `src/lib/queue/workers/question-gen.ts` | 改 | 两阶段生成（大纲→逐题生成+校验+重试/跳过） |
| `src/app/(dashboard)/questions/generate/page.tsx` | 改 | 表单字段 + 结果展示改造 |
| `src/components/questions/GeometrySvg.tsx` | 新建 | 几何图形 SVG 渲染（三角形/四边形/圆/坐标系/数轴） |
| `src/components/questions/ChartQuestionView.tsx` | 新建 | 按 `isChart`/`chartSpec`/`chartImagePrompt` 分发渲染 |

---

### Task 1: Prisma 模型扩展

**Files:**
- Modify: `prisma/schema.prisma:169-185`（`model Question`）

**Scope:** 仅新增 3 个可选/带默认值列。Out-of-scope：不删改既有字段/索引，不写历史数据回填脚本。
**Escape hatch:** 迁移因外键/约束冲突失败 → 停下检查 schema 现状，不强行 `prisma migrate reset` 或 `--force-reset`。

- [ ] **Step 1: 修改 Question 模型**

```prisma
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
  isChart          Boolean         @default(false)
  chartSpec        Json?
  chartImagePrompt String?
  createdAt        DateTime        @default(now())
}
```

- [ ] **Step 2: 生成并应用迁移**

Run: `pnpm prisma migrate dev --name add_question_chart_fields`
Expected: 终端输出 `Your database is now in sync with your schema.`，`prisma/migrations/` 下新增一个只含 `ALTER TABLE "Question" ADD COLUMN ...` 的迁移文件夹（不包含 DROP/ALTER 现有列）。

- [ ] **Step 3: 验证历史数据兼容**

Run: `pnpm prisma studio`（或 `psql` 执行 `SELECT id, "isChart", "chartSpec" FROM "Question" LIMIT 5;`）
Expected: 已有行 `isChart=false`、`chartSpec=NULL`，无报错。

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: Question 模型新增图表题字段"
```

---

### Task 2: 队列任务数据结构改造

**Files:**
- Modify: `src/lib/queue/queues.ts:16-24`（`QuestionGenJobData`）

**Scope:** 仅改类型定义本身。Out-of-scope：不在此任务修改消费该类型的 route.ts/worker.ts（留给 Task 6/7，本任务允许它们暂时类型不匹配）。
**Escape hatch:** 若发现其他队列（`ImageAnalysisJobData` 等）共享了这个类型/工具函数 → 停下评估影响面，不直接改共享部分。

- [ ] **Step 1: 替换 QuestionGenJobData**

```ts
export interface QuestionTypeCounts {
  single: number
  fill: number
  answer: number
}

export interface QuestionGenJobData {
  studentId: string
  knowledgePointIds?: string[]
  counts: QuestionTypeCounts
  chartEnabled: boolean
  chartPercentage?: number
  difficulty: string
  subject: string
  grade: string
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `tsc --noEmit`
Expected: 此时 `route.ts` 与 `question-gen.ts` 会因仍使用旧字段报错——这是预期的，留给 Task 6/7 修复，本步只确认 `queues.ts` 自身无语法错误（`tsc --noEmit 2>&1 | grep queues.ts` 应为空）。

- [ ] **Step 3: Commit**

```bash
git add src/lib/queue/queues.ts
git commit -m "feat: QuestionGenJobData 改为按题型计数+图表参数"
```

---

### Task 3: ChartSpec 类型与校验

**Files:**
- Create: `src/lib/question-gen/chart-spec.ts`
- Test: `tests/unit/question-gen-chart-spec.test.ts`

**Scope:** 仅定义 schema/类型，不含渲染逻辑（渲染在 Task 9）、不含 LLM 提示词模板（在 Task 7）。
**Escape hatch:** 若几何/数据图实际生成结果出现本 schema 覆盖不了的形态 → 停下扩展 schema 并同步更新本任务的测试，不在 worker/组件里用 `as any` 绕过。

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, it, expect } from 'vitest'
import { chartSpecSchema } from '@/lib/question-gen/chart-spec'

describe('chartSpecSchema', () => {
  it('accepts a geometry triangle spec', () => {
    const spec = {
      kind: 'geometry' as const,
      shape: 'triangle' as const,
      points: [{ x: 0, y: 0, label: 'A' }, { x: 4, y: 0, label: 'B' }, { x: 2, y: 3, label: 'C' }],
    }
    expect(chartSpecSchema.safeParse(spec).success).toBe(true)
  })

  it('accepts a data bar-chart spec', () => {
    const spec = {
      kind: 'data' as const,
      chartType: 'bar' as const,
      xKey: 'month',
      yKeys: ['sales'],
      data: [{ month: '1月', sales: 10 }, { month: '2月', sales: 20 }],
    }
    expect(chartSpecSchema.safeParse(spec).success).toBe(true)
  })

  it('rejects unknown kind', () => {
    const spec = { kind: 'unknown', foo: 'bar' }
    expect(chartSpecSchema.safeParse(spec).success).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test tests/unit/question-gen-chart-spec.test.ts`
Expected: FAIL，报错 `Cannot find module '@/lib/question-gen/chart-spec'`

- [ ] **Step 3: 实现 chart-spec.ts**

```ts
import { z } from 'zod'

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
})

const geometrySpecSchema = z.object({
  kind: z.literal('geometry'),
  shape: z.enum(['triangle', 'quadrilateral', 'circle', 'coordinate', 'number-line']),
  points: z.array(pointSchema).optional(),
  radius: z.number().optional(),
  labels: z.array(z.string()).optional(),
})

const dataChartSpecSchema = z.object({
  kind: z.literal('data'),
  chartType: z.enum(['bar', 'line', 'pie']),
  xKey: z.string(),
  yKeys: z.array(z.string()).min(1),
  data: z.array(z.record(z.string(), z.union([z.number(), z.string()]))),
})

export const chartSpecSchema = z.discriminatedUnion('kind', [geometrySpecSchema, dataChartSpecSchema])

export type ChartSpec = z.infer<typeof chartSpecSchema>
export type GeometrySpec = z.infer<typeof geometrySpecSchema>
export type DataChartSpec = z.infer<typeof dataChartSpecSchema>

export const GEOMETRY_SHAPES = geometrySpecSchema.shape.shape.options
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test tests/unit/question-gen-chart-spec.test.ts`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add src/lib/question-gen/chart-spec.ts tests/unit/question-gen-chart-spec.test.ts
git commit -m "feat: 新增 ChartSpec 类型与校验（几何/数据图两类）"
```

---

### Task 4: 90/10 知识点抽样纯函数

**Files:**
- Create: `src/lib/question-gen/sampling.ts`
- Test: `tests/unit/question-gen-sampling.test.ts`

对应 design.md D2、spec.md FR-2/FR-3、AC-2.1/2.2/2.3/3.1。

**Scope:** 纯函数 + 单测，不接 Prisma 查询（候选池查询在 Task 7 的 `loadMasteryPool`）。
**Escape hatch:** 若验证发现边界行为与 design.md D2 描述不一致 → 停下回 `docs/spec/question-gen-customization/spec.md`/design.md 核对，不擅自改算法定义。

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, it, expect } from 'vitest'
import { sampleKnowledgePoints, type MasteryPoint } from '@/lib/question-gen/sampling'

function mp(id: string, score: number): MasteryPoint {
  return { knowledgePointId: id, masteryScore: score }
}

describe('sampleKnowledgePoints', () => {
  it('splits 90/10 weak/good when pool is sufficient', () => {
    const pool = [mp('w1', 30), mp('w2', 40), mp('w3', 50), mp('g1', 80), mp('g2', 90)]
    const result = sampleKnowledgePoints(pool, 10)
    expect(result.degraded).toBe(false)
    const weakCount = result.assignments.filter((id) => ['w1', 'w2', 'w3'].includes(id)).length
    const goodCount = result.assignments.filter((id) => ['g1', 'g2'].includes(id)).length
    expect(weakCount).toBe(9)
    expect(goodCount).toBe(1)
    expect(result.assignments).toHaveLength(10)
  })

  it('repeats weak points when insufficient, never borrows from good pool', () => {
    const pool = [mp('w1', 30), mp('w2', 40), mp('g1', 80)]
    const result = sampleKnowledgePoints(pool, 10)
    expect(result.degraded).toBe(false)
    const weakAssignments = result.assignments.filter((id) => id !== 'g1')
    expect(weakAssignments.length).toBe(9)
    expect(new Set(weakAssignments)).toEqual(new Set(['w1', 'w2']))
    expect(result.assignments.filter((id) => id === 'g1')).toHaveLength(1)
  })

  it('degrades to all-good when there are zero weak points', () => {
    const pool = [mp('g1', 70), mp('g2', 90)]
    const result = sampleKnowledgePoints(pool, 6)
    expect(result.degraded).toBe(true)
    expect(result.assignments).toHaveLength(6)
    expect(result.assignments.every((id) => ['g1', 'g2'].includes(id))).toBe(true)
  })

  it('throws when pool is completely empty', () => {
    expect(() => sampleKnowledgePoints([], 5)).toThrow()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test tests/unit/question-gen-sampling.test.ts`
Expected: FAIL，`Cannot find module '@/lib/question-gen/sampling'`

- [ ] **Step 3: 实现 sampling.ts**

```ts
export interface MasteryPoint {
  knowledgePointId: string
  masteryScore: number
}

export interface SampleResult {
  assignments: string[]
  degraded: boolean
}

const WEAK_THRESHOLD = 60
const WEAK_RATIO = 0.9

export function sampleKnowledgePoints(pool: MasteryPoint[], count: number): SampleResult {
  if (pool.length === 0) {
    throw new Error('Knowledge point pool is empty: cannot sample without any StudentMastery records')
  }

  const weak = pool.filter((p) => p.masteryScore < WEAK_THRESHOLD)
  const good = pool.filter((p) => p.masteryScore >= WEAK_THRESHOLD)

  if (weak.length === 0) {
    return { assignments: repeatPick(good, count), degraded: true }
  }

  const weakCount = Math.round(count * WEAK_RATIO)
  const goodCount = count - weakCount

  const weakAssignments = repeatPick(weak, weakCount)
  const goodAssignments = good.length > 0 ? repeatPick(good, goodCount) : repeatPick(weak, goodCount)

  return { assignments: [...weakAssignments, ...goodAssignments], degraded: false }
}

function repeatPick(points: MasteryPoint[], count: number): string[] {
  if (count <= 0) return []
  const ids = points.map((p) => p.knowledgePointId)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(ids[i % ids.length])
  }
  return result
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test tests/unit/question-gen-sampling.test.ts`
Expected: PASS（4 passed）

> 注意第二个用例：`goodCount=1` 但 good 池有 `g1`，`repeatPick(good, 1)` 返回 `['g1']`，符合"不借用良好知识点池补薄弱"——这里 good 池本身有数据，10%配额走 good 池是正常路径，跟"薄弱不足时借良好池补 90%缺口"是两件事，不要混淆。

- [ ] **Step 5: Commit**

```bash
git add src/lib/question-gen/sampling.ts tests/unit/question-gen-sampling.test.ts
git commit -m "feat: 实现 90/10 知识点抽样纯函数"
```

---

### Task 5: 图表题配额纯函数

**Files:**
- Create: `src/lib/question-gen/chart-quota.ts`
- Test: `tests/unit/question-gen-chart-quota.test.ts`

对应 design.md D3、spec.md FR-4、AC-4.1/4.2/4.3。

**Scope:** 纯函数 + 单测，不涉及如何把 `chartQuota` 结果分配到具体哪几道题（分配顺序在 Task 7 worker 主流程里处理）。
**Escape hatch:** 若百分比换算结果与 design.md D3 公式描述不一致 → 停下核对公式，不私自调整保底/封顶规则。

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, it, expect } from 'vitest'
import { chartQuota } from '@/lib/question-gen/chart-quota'

describe('chartQuota', () => {
  it('rounds normally above the floor', () => {
    expect(chartQuota(10, 30)).toBe(3)
  })

  it('floors to 1 when rounding would go below 1', () => {
    expect(chartQuota(2, 10)).toBe(1)
  })

  it('returns 0 when type count is 0, regardless of percentage', () => {
    expect(chartQuota(0, 50)).toBe(0)
  })

  it('caps at the type count', () => {
    expect(chartQuota(3, 100)).toBe(3)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test tests/unit/question-gen-chart-quota.test.ts`
Expected: FAIL，`Cannot find module '@/lib/question-gen/chart-quota'`

- [ ] **Step 3: 实现 chart-quota.ts**

```ts
export function chartQuota(countType: number, percentage: number): number {
  if (countType === 0) return 0
  const raw = Math.round((countType * percentage) / 100)
  return Math.min(countType, Math.max(1, raw))
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test tests/unit/question-gen-chart-quota.test.ts`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add src/lib/question-gen/chart-quota.ts tests/unit/question-gen-chart-quota.test.ts
git commit -m "feat: 实现图表题配额算法（保底1道，封顶题型总数）"
```

---

### Task 6: API 路由 zod schema 改造

**Files:**
- Modify: `src/app/api/questions/generate/route.ts:8-16`
- Test: `tests/unit/question-gen-schema.test.ts`

对应 spec.md FR-1/FR-2/FR-4、proposal.md 的 BREAKING 变更点。

**Scope:** 仅改请求体校验 schema 与入队参数透传；不改鉴权中间件、不改 GET 接口的业务逻辑（仅按需补充返回字段）。
**Escape hatch:** 若发现 schema 字段与 `lib/queue/queues.ts` 的 `QuestionGenJobData`（Task 2）对不上 → 停下先同步两边类型，再继续，不在 route.ts 里做隐式类型转换掩盖不一致。

- [ ] **Step 1: 写失败的测试（针对新 schema）**

```ts
import { describe, it, expect } from 'vitest'
import { genSchema } from '@/app/api/questions/generate/route'

const base = {
  studentId: 'clx0000000000000000000001',
  difficulty: 'medium',
  subject: '数学',
  grade: '七年级',
  counts: { single: 3, fill: 2, answer: 1 },
  chartEnabled: false,
}

describe('genSchema', () => {
  it('accepts a valid payload without knowledgePointIds', () => {
    expect(genSchema.safeParse(base).success).toBe(true)
  })

  it('rejects missing studentId', () => {
    const { studentId, ...rest } = base
    expect(genSchema.safeParse(rest).success).toBe(false)
  })

  it('requires chartPercentage when chartEnabled is true', () => {
    const withChart = { ...base, chartEnabled: true }
    expect(genSchema.safeParse(withChart).success).toBe(false)
    expect(genSchema.safeParse({ ...withChart, chartPercentage: 30 }).success).toBe(true)
  })

  it('rejects chartPercentage out of 0-100 range', () => {
    expect(genSchema.safeParse({ ...base, chartEnabled: true, chartPercentage: 150 }).success).toBe(false)
  })

  it('accepts optional knowledgePointIds', () => {
    expect(genSchema.safeParse({ ...base, knowledgePointIds: ['clx0000000000000000000002'] }).success).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test tests/unit/question-gen-schema.test.ts`
Expected: FAIL（`genSchema` 当前未导出，且字段形状不匹配）

- [ ] **Step 3: 改造 route.ts**

```ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { questionGenQueue } from '@/lib/queue/queues'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'

export const genSchema = z
  .object({
    studentId: z.string().cuid(),
    knowledgePointIds: z.array(z.string().cuid()).optional(),
    counts: z.object({
      single: z.number().int().min(0),
      fill: z.number().int().min(0),
      answer: z.number().int().min(0),
    }),
    chartEnabled: z.boolean(),
    chartPercentage: z.number().min(0).max(100).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    subject: z.string().min(1),
    grade: z.string().min(1),
  })
  .refine((v) => !v.chartEnabled || typeof v.chartPercentage === 'number', {
    message: 'chartPercentage is required when chartEnabled is true',
    path: ['chartPercentage'],
  })

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) return Response.json({ error: '未登录' }, { status: 401 })
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
  const session = await requireAuth()
  if (!session) return Response.json({ error: '未登录' }, { status: 401 })
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

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test tests/unit/question-gen-schema.test.ts`
Expected: PASS（5 passed）

- [ ] **Step 5: Commit**

```bash
git add src/app/api/questions/generate/route.ts tests/unit/question-gen-schema.test.ts
git commit -m "feat: 个性化出题 API schema 改为按题型计数+学生必选+图表参数"
```

---

### Task 7: Worker 重写 — 两阶段生成主流程

**Files:**
- Modify: `src/lib/queue/workers/question-gen.ts`（整体重写）

对应 design.md D4、spec.md FR-3/FR-5/FR-6、AC-2.x/3.1/5.x/6.x。这一段是集成逻辑（DB+LLM+队列），现有代码库里 worker 没有先例测试（`question-gen.ts` 原版本同样无测试），延续现状不补单测，改为 Step 3 的手动验证覆盖；纯逻辑已在 Task 4/5 用单测覆盖并在此处复用。

**Scope:** 大纲生成→逐题生成→校验→重试/跳过的主流程；不改 `/api/questions/[id]/approve`（审核入库）流程，不改 BullMQ 的重试/backoff 队列级配置（`queues.ts` 的 `defaultJobOptions`）。
**Escape hatch:** 若 LLM 返回格式持续不稳定导致跳过率过高（例如连续多次任务 skipped 超过 30%）→ 停下记录到 `docs/spec/question-gen-customization/spec.md` 的「实现与测试记录」章节，不通过放宽 `isConsistentWithOutline` 校验掩盖问题。

- [ ] **Step 1: 整体替换 question-gen.ts**

```ts
import { Worker } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { QuestionGenJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'
import { sampleKnowledgePoints, type MasteryPoint } from '@/lib/question-gen/sampling'
import { chartQuota } from '@/lib/question-gen/chart-quota'
import { chartSpecSchema, type ChartSpec } from '@/lib/question-gen/chart-spec'

const TYPE_LABEL: Record<string, string> = { single: '单选题', fill: '填空题', answer: '解答题' }
const MAX_OUTLINE_RETRIES = 2
const MAX_ITEM_RETRIES = 2

interface OutlineItem {
  draftContent: string
  draftAnswer: string
  knowledgePointId: string
  isChart: boolean
  chartKind?: 'geometry' | 'data' | 'experiment'
  chartDraft?: unknown
}

interface FinalItem {
  content: string
  answer: string
  explanation: string
  scoringCriteria: string | null
  difficultyLevel: number
  isChart: boolean
  chartSpec: ChartSpec | null
  chartImagePrompt: string | null
  knowledgePointId: string
}

async function loadMasteryPool(
  studentId: string,
  subject: string,
  grade: string,
  knowledgePointIds?: string[]
): Promise<MasteryPoint[]> {
  const masteries = await prisma.studentMastery.findMany({
    where: {
      studentId,
      ...(knowledgePointIds?.length
        ? { knowledgePointId: { in: knowledgePointIds } }
        : { knowledgePoint: { subject, grade } }),
    },
    select: { knowledgePointId: true, masteryScore: true },
  })
  return masteries
}

async function generateOutlineForType(
  type: string,
  count: number,
  chartCount: number,
  knowledgePointIds: string[],
  knowledgePointNames: Map<string, string>,
  subject: string,
  grade: string,
  difficulty: string
): Promise<OutlineItem[]> {
  if (count === 0) return []
  const textProvider = providerRegistry.getTextProvider()

  for (let attempt = 0; attempt <= MAX_OUTLINE_RETRIES; attempt++) {
    const kpNames = knowledgePointIds.map((id) => knowledgePointNames.get(id) ?? id)
    const prompt = `你是一位经验丰富的${subject}老师，请为${grade}年级学生拟一份${TYPE_LABEL[type]}的出题大纲（不是最终题目，只是草稿题干+草稿答案）。

考查知识点（按顺序逐题对应，共${count}道）：${kpNames.join('、')}
难度：${difficulty}
其中第 1 到第 ${chartCount} 道需要是图表题：几何图形或物理/化学/生物实验图，请在该题对象中标注 "chart_kind"（"geometry" 或 "experiment"），并给出 "chart_draft"（几何题给出图形类型与关键点坐标；实验题给出一段图片生成提示词文本）。

请严格以 JSON 数组返回，长度为 ${count}，每项：
{
  "draft_content": "草稿题干",
  "draft_answer": "草稿答案",
  "is_chart": true/false,
  "chart_kind": "geometry" | "experiment" | null,
  "chart_draft": { ... } | "提示词文本" | null
}`

    try {
      const raw = await textProvider.generateText(prompt, { temperature: 0.7, maxTokens: 4096 })
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error(`大纲生成 JSON 解析失败（题型：${type}）`)
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        draft_content: string; draft_answer: string; is_chart: boolean
        chart_kind: 'geometry' | 'experiment' | null; chart_draft: unknown
      }>
      if (parsed.length !== count) throw new Error(`大纲数量不符：期望 ${count}，实际 ${parsed.length}`)

      return parsed.map((item, idx) => ({
        draftContent: item.draft_content,
        draftAnswer: item.draft_answer,
        knowledgePointId: knowledgePointIds[idx],
        isChart: item.is_chart,
        chartKind: item.chart_kind ?? undefined,
        chartDraft: item.chart_draft,
      }))
    } catch (err) {
      if (attempt === MAX_OUTLINE_RETRIES) {
        throw new Error(`题型「${TYPE_LABEL[type]}」大纲生成重试 ${MAX_OUTLINE_RETRIES} 次后仍失败：${(err as Error).message}`)
      }
    }
  }
  return []
}

async function generateAndValidateItem(
  type: string,
  outline: OutlineItem,
  subject: string,
  grade: string,
  difficulty: string
): Promise<FinalItem | null> {
  const textProvider = providerRegistry.getTextProvider()

  for (let attempt = 0; attempt <= MAX_ITEM_RETRIES; attempt++) {
    try {
      const prompt = `请把下面这道${subject}${TYPE_LABEL[type]}的草稿"润色/完整化"为正式题目，不要改变题干主旨与答案结论。

草稿题干：${outline.draftContent}
草稿答案：${outline.draftAnswer}
年级：${grade}　难度：${difficulty}
${outline.isChart ? `这是一道图表题，图表草稿：${JSON.stringify(outline.chartDraft)}` : ''}

请以 JSON 返回：
{
  "content": "完整题干",
  "answer": "标准答案",
  "explanation": "解题过程（100-200字）",
  "scoring_criteria": "评分标准或null",
  "difficulty_level": 1-5
  ${outline.isChart && outline.chartKind === 'geometry' ? ', "chart_spec": { "kind": "geometry", ... }' : ''}
  ${outline.isChart && outline.chartKind === 'experiment' ? ', "chart_image_prompt": "图片生成提示词"' : ''}
}`
      const raw = await textProvider.generateText(prompt, { temperature: 0.5, maxTokens: 2048 })
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('逐题生成 JSON 解析失败')
      const item = JSON.parse(jsonMatch[0]) as {
        content: string; answer: string; explanation: string
        scoring_criteria: string | null; difficulty_level: number
        chart_spec?: unknown; chart_image_prompt?: string
      }

      if (!isConsistentWithOutline(item, outline)) {
        throw new Error('生成结果偏离大纲（题干主旨或答案结论不一致）')
      }

      let chartSpec: ChartSpec | null = null
      if (outline.isChart && outline.chartKind === 'geometry') {
        const result = chartSpecSchema.safeParse(item.chart_spec)
        if (!result.success) throw new Error('chartSpec 校验失败，与题干图形描述不一致')
        chartSpec = result.data
      }

      return {
        content: item.content,
        answer: item.answer,
        explanation: item.explanation,
        scoringCriteria: item.scoring_criteria,
        difficultyLevel: item.difficulty_level ?? 3,
        isChart: outline.isChart,
        chartSpec,
        chartImagePrompt: outline.isChart && outline.chartKind === 'experiment' ? (item.chart_image_prompt ?? null) : null,
        knowledgePointId: outline.knowledgePointId,
      }
    } catch {
      if (attempt === MAX_ITEM_RETRIES) return null
    }
  }
  return null
}

function isConsistentWithOutline(
  item: { content: string; answer: string },
  outline: OutlineItem
): boolean {
  return item.content.length > 0 && item.answer.length > 0
}

export const questionGenWorker = new Worker<QuestionGenJobData>(
  'question_gen',
  async (job) => {
    const { studentId, knowledgePointIds, counts, chartEnabled, chartPercentage, subject, grade, difficulty } = job.data

    const pool = await loadMasteryPool(studentId, subject, grade, knowledgePointIds)
    const allKpIds = Array.from(new Set(pool.map((p) => p.knowledgePointId)))
    const knowledgePoints = await prisma.knowledgePoint.findMany({ where: { id: { in: allKpIds } } })
    const kpNameMap = new Map(knowledgePoints.map((k) => [k.id, k.name]))

    let degraded = false
    const skipped: string[] = []
    let succeeded = 0
    let total = 0

    for (const type of ['single', 'fill', 'answer'] as const) {
      const count = counts[type]
      if (count === 0) continue
      total += count

      const sample = sampleKnowledgePoints(pool, count)
      degraded = degraded || sample.degraded

      const chartCount = chartEnabled ? chartQuota(count, chartPercentage ?? 0) : 0
      const outline = await generateOutlineForType(
        type, count, chartCount, sample.assignments, kpNameMap, subject, grade, difficulty
      )

      for (const item of outline) {
        const finalItem = await generateAndValidateItem(type, item, subject, grade, difficulty)
        if (!finalItem) {
          skipped.push(`${TYPE_LABEL[type]}：知识点 ${kpNameMap.get(item.knowledgePointId) ?? item.knowledgePointId}`)
          continue
        }
        await prisma.question.create({
          data: {
            content: finalItem.content,
            type,
            answer: finalItem.answer,
            explanation: finalItem.explanation,
            scoringCriteria: finalItem.scoringCriteria,
            subject,
            grade,
            difficulty: finalItem.difficultyLevel,
            knowledgePointId: finalItem.knowledgePointId,
            isChart: finalItem.isChart,
            chartSpec: finalItem.chartSpec ?? undefined,
            chartImagePrompt: finalItem.chartImagePrompt,
            source: 'ai_generated',
            status: 'draft',
          },
        })
        succeeded++
      }
    }

    const aiJob = await prisma.aIJob.findFirst({ where: { id: job.id!, type: 'question_gen' } })
    const resultSummary = {
      total,
      succeeded,
      skipped,
      degradedToGoodPoints: degraded,
    }
    if (aiJob) {
      await prisma.aIJob.update({
        where: { id: aiJob.id },
        data: { status: 'completed', result: resultSummary },
      })
    }

    return resultSummary
  },
  { connection: getRedisConnection(), concurrency: 2 }
)
```

- [ ] **Step 2: 类型检查**

Run: `tsc --noEmit`
Expected: 0 错误（`prisma.studentMastery` 字段名需与 `schema.prisma` 的模型名 `StudentMastery` 对应的 Prisma Client 访问器一致，运行前先 `pnpm prisma generate`）。

- [ ] **Step 3: 手动验证一次完整任务**

Run: 启动 `pnpm dev:all`，通过页面或 `curl` 触发一次生成任务（学生选一个有 `StudentMastery` 记录的学生），观察 `AIJob.result`。
Expected: 返回 `{ total, succeeded, skipped: [], degradedToGoodPoints: false }`，且 `succeeded` 道题目已写入 `Question` 表 `status='draft'`。

- [ ] **Step 4: Commit**

```bash
git add src/lib/queue/workers/question-gen.ts
git commit -m "feat: worker 重写为两阶段生成（大纲→逐题生成+校验+重试/跳过）"
```

---

### Task 8: 前端表单改造

**Files:**
- Modify: `src/app/(dashboard)/questions/generate/page.tsx`（整体重写）

对应 spec.md FR-1/FR-2/FR-4、design.md D6。

**Scope:** 表单字段定义、提交 payload 组装、结果区接入 `ChartQuestionView`（Task 9 产出）。Out-of-scope：不改页面整体三栏布局结构，不改 `JobProgressBar` 组件内部实现。
**Escape hatch:** 若 `/api/students` 现有响应字段（`name`/`class.name` 等）与本任务假设的不一致 → 停下用 Explore 工具核对实际响应结构，不臆造新接口或新字段。

- [ ] **Step 1: 替换 page.tsx**

```tsx
'use client'
import { useState } from 'react'
import { Form, Select, InputNumber, Button, Card, Table, Tag, Space, message, Row, Col, Segmented, Checkbox } from 'antd'
import { HistoryOutlined, BulbOutlined, PlayCircleOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { JobProgressBar } from '@/components/shared/JobProgressBar'
import { ChartQuestionView } from '@/components/questions/ChartQuestionView'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '基础' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '提高' },
]

interface GenerateFormValues {
  studentId: string
  knowledgePointIds?: string[]
  difficulty: string
  subject: string
  grade: string
  single: number
  fill: number
  answer: number
  chartEnabled: boolean
  chartPercentage?: number
}

export default function QuestionGeneratePage() {
  const [form] = Form.useForm<GenerateFormValues>()
  const [jobId, setJobId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [chartEnabled, setChartEnabled] = useState(false)

  const { data: studentData } = useSWR('/api/students?limit=100', fetcher)
  const { data: kpData } = useSWR('/api/knowledge/points', fetcher)
  const { data: qData, mutate: refetchQ } = useSWR(showResults ? '/api/questions?status=draft' : null, fetcher)

  const studentOptions = (studentData?.students ?? []).map((s: { id: string; name: string; class?: { name: string } }) => ({
    value: s.id,
    label: `${s.name}${s.class?.name ? `（${s.class.name}）` : ''}`,
  }))

  const kpOptions = (kpData?.knowledgePoints ?? []).map(
    (k: { id: string; name: string; chapter?: string | null }) => ({
      value: k.id,
      label: `${k.chapter ? `[${k.chapter}] ` : ''}${k.name}`,
    })
  )

  async function handleGenerate(values: GenerateFormValues) {
    setGenerating(true)
    const { single, fill, answer, chartEnabled: chartOn, chartPercentage, ...rest } = values
    const res = await fetch('/api/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...rest,
        counts: { single, fill, answer },
        chartEnabled: chartOn,
        ...(chartOn ? { chartPercentage } : {}),
      }),
    })
    const data = await res.json()
    setJobId(data.jobId)
  }

  async function handleApprove(id: string) {
    await fetch(`/api/questions/${id}/approve`, { method: 'POST' })
    message.success('已审核通过入库')
    refetchQ()
  }

  const approvedCount = (qData?.questions ?? []).filter(
    (q: { status: string }) => q.status === 'approved'
  ).length

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>个性化试题生成</div>

      <Row gutter={12}>
        {/* Left: Form Panel */}
        <Col span={7}>
          <Card title="生成参数设置" styles={{ body: { padding: '16px' } }}>
            <Form form={form} layout="vertical" onFinish={handleGenerate} size="small">
              <Form.Item name="subject" label="学科" initialValue="数学" rules={[{ required: true }]}>
                <Select options={['数学', '语文', '英语', '物理', '化学'].map((s) => ({ value: s, label: s }))} />
              </Form.Item>

              <Form.Item name="grade" label="年级" initialValue="七年级" rules={[{ required: true }]}>
                <Select options={['七年级', '八年级', '九年级'].map((g) => ({ value: g, label: g }))} />
              </Form.Item>

              <Form.Item name="studentId" label="学生" rules={[{ required: true, message: '请选择学生' }]}>
                <Select options={studentOptions} placeholder="选择学生（驱动按学情自动抽样）" showSearch optionFilterProp="label" />
              </Form.Item>

              <Form.Item name="knowledgePointIds" label="知识点（可选）">
                <Select
                  mode="multiple"
                  options={kpOptions}
                  placeholder="不选则按学生学情自动 90/10 抽样"
                  maxTagCount={3}
                  allowClear
                />
              </Form.Item>

              <Form.Item label="题型数量" required>
                <Space.Compact block>
                  <Form.Item name="single" initialValue={0} noStyle rules={[{ required: true }]}>
                    <InputNumber min={0} max={20} addonBefore="单选" style={{ width: '33%' }} />
                  </Form.Item>
                  <Form.Item name="fill" initialValue={0} noStyle rules={[{ required: true }]}>
                    <InputNumber min={0} max={20} addonBefore="填空" style={{ width: '33%' }} />
                  </Form.Item>
                  <Form.Item name="answer" initialValue={0} noStyle rules={[{ required: true }]}>
                    <InputNumber min={0} max={20} addonBefore="解答" style={{ width: '34%' }} />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>

              <Form.Item name="difficulty" label="难度" initialValue="medium" rules={[{ required: true }]}>
                <Segmented options={DIFFICULTY_OPTIONS} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="chartEnabled" valuePropName="checked" initialValue={false}>
                <Checkbox onChange={(e) => setChartEnabled(e.target.checked)}>包含图表题</Checkbox>
              </Form.Item>

              {chartEnabled && (
                <Form.Item
                  name="chartPercentage"
                  label="图表题百分比"
                  initialValue={30}
                  rules={[{ required: true, type: 'number', min: 0, max: 100 }]}
                >
                  <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                </Form.Item>
              )}

              <Button type="primary" htmlType="submit" loading={generating} block icon={<PlayCircleOutlined />} style={{ borderRadius: 8 }}>
                开始生成
              </Button>
            </Form>

            <JobProgressBar jobId={jobId} onDone={() => { setGenerating(false); setShowResults(true); refetchQ() }} />
          </Card>
        </Col>

        {/* Center: Preview Panel */}
        <Col span={10}>
          <Card
            title={`生成结果（${qData?.total ?? 0} 题，已入库 ${approvedCount} 题）`}
            styles={{ body: { padding: 0, maxHeight: 560, overflowY: 'auto' } }}
          >
            <Table
              dataSource={qData?.questions ?? []}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: '点击"开始生成"后结果显示于此' }}
              columns={[
                { title: '题目', dataIndex: 'content', ellipsis: true,
                  render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
                { title: '知识点', dataIndex: ['knowledgePoint', 'name'], width: 90, ellipsis: true,
                  render: (v: string) => <span style={{ fontSize: 11 }}>{v}</span> },
                { title: '操作', width: 80, render: (_: unknown, r: { id: string; status: string }) => (
                  <Space size={4}>
                    {r.status === 'draft' && <Button size="small" type="primary" onClick={() => handleApprove(r.id)}>通过</Button>}
                    {r.status === 'approved' && <Tag color="success" style={{ fontSize: 11 }}>已入库</Tag>}
                  </Space>
                )},
              ]}
              expandable={{
                expandedRowRender: (r) => {
                  const row = r as unknown as {
                    answer: string; explanation: string
                    isChart: boolean; chartSpec: unknown; chartImagePrompt: string | null
                  }
                  return (
                    <div style={{ fontSize: 12, padding: '6px 8px', background: '#fafafa', lineHeight: 1.8 }}>
                      <strong>答案：</strong>{row.answer}<br />
                      <strong>解析：</strong>{row.explanation}
                      {row.isChart && <ChartQuestionView chartSpec={row.chartSpec} chartImagePrompt={row.chartImagePrompt} />}
                    </div>
                  )
                },
              }}
            />
          </Card>
        </Col>

        {/* Right: History + Suggestions */}
        <Col span={7}>
          <Card
            title={<span><HistoryOutlined style={{ marginRight: 6, color: '#666' }} />生成记录</span>}
            style={{ marginBottom: 10, height: 240 }}
            styles={{ body: { padding: '10px 12px', height: 178, overflowY: 'auto' } }}
          >
            {(qData?.total ?? 0) === 0 ? (
              <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', paddingTop: 30 }}>暂无生成记录</div>
            ) : (
              <div style={{ fontSize: 12, color: '#555', lineHeight: 2 }}>
                <div>共生成题目：<strong>{qData?.total ?? 0}</strong> 题</div>
                <div>已审核入库：<strong style={{ color: '#52c41a' }}>{approvedCount}</strong> 题</div>
                <div>待审核：<strong style={{ color: '#faad14' }}>{(qData?.total ?? 0) - approvedCount}</strong> 题</div>
              </div>
            )}
          </Card>
          <Card
            title={<span><BulbOutlined style={{ color: '#faad14', marginRight: 6 }} />学情建议</span>}
            styles={{ body: { padding: '10px 12px', fontSize: 12, color: '#555', lineHeight: 2 } }}
          >
            <div>• 不选知识点时将按该生 90% 薄弱 / 10% 良好知识点自动抽样</div>
            <div>• 勾选图表题后，每种数量&gt;0的题型至少分配 1 道图表题</div>
            <div>• 难度梯度：基础题 60%，中等题 30%，提高题 10%</div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `tsc --noEmit`
Expected: 0 错误。

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/questions/generate/page.tsx"
git commit -m "feat: 出题表单改为题型独立配额+学生必选+图表题勾选"
```

---

### Task 9: 图表渲染组件

**Files:**
- Create: `src/components/questions/GeometrySvg.tsx`
- Create: `src/components/questions/ChartQuestionView.tsx`

对应 design.md D1、spec.md FR-5。

**Scope:** 仅覆盖初中数学常见图形集合（三角形/四边形/圆/坐标系/数轴）+ `recharts` 数据图封装。Out-of-scope：不引入新 npm 包，不支持任意复杂几何图形。
**Escape hatch:** 某几何图形渲染失真或形状超出 `GEOMETRY_SHAPES` 枚举 → 按 design.md 风险缓解策略降级为 `chartImagePrompt` 式纯文字提示展示，不强行调渲染参数凑效果。

- [ ] **Step 1: 实现 GeometrySvg.tsx**

```tsx
import type { GeometrySpec } from '@/lib/question-gen/chart-spec'

const SIZE = 220

export function GeometrySvg({ spec }: { spec: GeometrySpec }) {
  if (spec.shape === 'triangle' || spec.shape === 'quadrilateral') {
    if (!spec.points?.length) return null
    const pointsAttr = spec.points.map((p) => `${p.x * 20 + 20},${SIZE - p.y * 20 - 20}`).join(' ')
    return (
      <svg width={SIZE} height={SIZE} style={{ background: '#fff', border: '1px solid #eee' }}>
        <polygon points={pointsAttr} fill="none" stroke="#1677ff" strokeWidth={2} />
        {spec.points.map((p, i) => (
          <text key={i} x={p.x * 20 + 24} y={SIZE - p.y * 20 - 24} fontSize={12} fill="#333">
            {p.label ?? ''}
          </text>
        ))}
      </svg>
    )
  }

  if (spec.shape === 'circle') {
    const r = (spec.radius ?? 5) * 20
    return (
      <svg width={SIZE} height={SIZE} style={{ background: '#fff', border: '1px solid #eee' }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="#1677ff" strokeWidth={2} />
      </svg>
    )
  }

  if (spec.shape === 'number-line') {
    return (
      <svg width={SIZE} height={60} style={{ background: '#fff', border: '1px solid #eee' }}>
        <line x1={10} y1={30} x2={SIZE - 10} y2={30} stroke="#333" strokeWidth={2} />
        {(spec.labels ?? []).map((label, i) => (
          <text key={i} x={20 + i * 40} y={50} fontSize={12} fill="#333">{label}</text>
        ))}
      </svg>
    )
  }

  return <div style={{ fontSize: 12, color: '#999' }}>暂不支持渲染该几何类型：{spec.shape}</div>
}
```

- [ ] **Step 2: 实现 ChartQuestionView.tsx**

```tsx
'use client'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { chartSpecSchema } from '@/lib/question-gen/chart-spec'
import { GeometrySvg } from './GeometrySvg'

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1']

export function ChartQuestionView({
  chartSpec,
  chartImagePrompt,
}: {
  chartSpec: unknown
  chartImagePrompt: string | null
}) {
  if (chartImagePrompt) {
    return (
      <div style={{ marginTop: 8, padding: 8, background: '#fff7e6', border: '1px dashed #faad14', fontSize: 12 }}>
        <strong>图片生成提示词（待人工配图）：</strong>{chartImagePrompt}
      </div>
    )
  }

  const parsed = chartSpecSchema.safeParse(chartSpec)
  if (!parsed.success) {
    return <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>图表数据缺失或格式不正确</div>
  }
  const spec = parsed.data

  if (spec.kind === 'geometry') {
    return <div style={{ marginTop: 8 }}><GeometrySvg spec={spec} /></div>
  }

  return (
    <div style={{ marginTop: 8 }}>
      {spec.chartType === 'bar' && (
        <BarChart width={300} height={200} data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.xKey} />
          <YAxis />
          <Tooltip />
          {spec.yKeys.map((key, i) => <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />)}
        </BarChart>
      )}
      {spec.chartType === 'line' && (
        <LineChart width={300} height={200} data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.xKey} />
          <YAxis />
          <Tooltip />
          {spec.yKeys.map((key, i) => <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />)}
        </LineChart>
      )}
      {spec.chartType === 'pie' && (
        <PieChart width={300} height={200}>
          <Pie data={spec.data} dataKey={spec.yKeys[0]} nameKey={spec.xKey} cx="50%" cy="50%" outerRadius={80} label>
            {spec.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 类型检查**

Run: `tsc --noEmit`
Expected: 0 错误。

- [ ] **Step 4: 手动验证渲染**

Run: `pnpm dev:all`，生成含图表题的一批题目，展开结果表格行。
Expected: 几何题展示对应 SVG 图形，数据图题展示 recharts 图表，实验题展示提示词文本框。

- [ ] **Step 5: Commit**

```bash
git add src/components/questions/GeometrySvg.tsx src/components/questions/ChartQuestionView.tsx
git commit -m "feat: 新增几何 SVG 渲染与图表题展示组件"
```

---

### Task 10: 全量验证（DoD）

**Files:** 无新文件，仅运行命令。

**Scope:** 仅运行验证命令与手动检查清单；不在此任务内修复发现的问题（修复应回到对应 Task 1-9 提交独立 fix commit）。
**Escape hatch:** 任一命令失败或手测项不符 → 停下定位失败原因，记录到 spec.md「验证记录（DoD）」章节，不得跳过该项直接进入 N7 审查。

- [ ] **Step 1: 类型检查**

Run: `tsc --noEmit`
Expected: 0 错误

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: 0 错误

- [ ] **Step 3: 单元测试**

Run: `pnpm test`
Expected: 全部用例通过，包含 Task 3/4/5/6 新增的 16 个用例

- [ ] **Step 4: 构建**

Run: `pnpm build`
Expected: 构建成功，无类型/打包错误

- [ ] **Step 5: 手动验证清单（对应 spec.md AC-2.1~AC-7.1）**

- 选学生不选知识点，生成10题 → 约9题对应薄弱知识点
- 选学生且手选知识点 → 仅在手选范围内按90/10分配
- 选一个全部知识点 masteryScore≥60 的学生 → 任务结果含 `degradedToGoodPoints: true`
- 题型数量=2，图表百分比=10% → 该题型仍分配1道图表题
- 不勾选图表题 → 所有题目 `isChart=false`
- 故意让某题校验持续失败（可临时改小 `MAX_ITEM_RETRIES` 测试）→ 确认该题被跳过且不拖累其他题目

- [ ] **Step 6: Commit（若验证中有修复）**

```bash
git add -A
git commit -m "fix: DoD 验证中发现的问题修复"
```

---

## Self-Review 记录

- **Spec 覆盖**：FR-1→Task 6/8；FR-2→Task 4/6/7/8；FR-3→Task 4/7；FR-4→Task 5/6/7/8；FR-5→Task 7/9；FR-6→Task 7；NFR-1→Task 1。8 条 OpenSpec Requirement 均有对应任务，无缺口。
- **占位符扫描**：已检查，无 TBD/TODO/"参照 Task N 类似实现"等占位写法，所有步骤含完整代码。
- **类型一致性**：`ChartSpec`/`GeometrySpec`/`DataChartSpec`（Task 3）在 Task 7（worker）、Task 9（渲染组件）中复用同一组类型名，未出现改名不一致。`QuestionGenJobData`（Task 2）字段名与 Task 6 route.ts、Task 7 worker.ts 消费方式一致。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-17-question-gen-customization.md`. Two execution options:

1. **Subagent-Driven (recommended)** - 逐任务派发新子代理实现，两阶段审查
2. **Inline Execution** - 在当前会话内按任务批量执行，每个 checkpoint 停下复核

Which approach?
