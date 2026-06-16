## Why

当前"个性化试题生成"页面只能选一种题型、设一个统一数量，知识点靠教师手动多选，且 worker 一次性生成整批 JSON、没有按学生学情自动出题、不支持图表题。教师无法生成接近学校真实考试质量、按学生真实薄弱点定向补弱的试卷，每次还要自己判断该考哪些知识点。

## What Changes

- 表单：题型从"单选一种题型+统一数量"改为单选题/填空题/解答题各自独立设置数量。
- 表单：新增"学生"下拉为必选字段，知识点多选改为可选——不选则按该学生知识点掌握情况自动 90/10（薄弱/良好）抽样，选了则在选中范围内仍按 90/10 权重分配。
- 表单：新增"图表题"勾选框 + 百分比输入；勾选后每种题型按百分比分配图表题数量，且数量>0的题型至少分配 1 道图表题。
- API（`POST /api/questions/generate`）：**BREAKING** — 请求体 schema 变更，`type` + `count` 单一字段改为按题型分别计数的对象，新增 `studentId`（必填）、`chartEnabled`/`chartPercentage` 字段，`knowledgePointIds` 改为可选。
- Worker（`question-gen.ts`）：重写为两阶段生成——(1) 按题型分别生成大纲（草稿题干+答案，图表题派生图表数据/提示词），(2) 严格按大纲逐题生成+润色+一致性校验，单题失败可独立重试与跳过，不拖累整批。
- 数据模型：`Question` 新增 3 个可选字段 `isChart`、`chartSpec`、`chartImagePrompt`（新增列迁移，不影响历史数据）。
- 前端结果展示：图表题按 `chartSpec`（结构化渲染）或 `chartImagePrompt`（文字提示词）分别展示。

## Capabilities

### New Capabilities
- `personalized-question-generation`: 按学生知识点掌握情况、题型分别配额、图表题配额规则，分阶段生成并校验试题的能力。

### Modified Capabilities
（无现有 spec：`questions/generate` 此前未建过 OpenSpec 能力规格，本次是首次建档，不算"修改现有需求"）

## Impact

- **前端**：`src/app/(dashboard)/questions/generate/page.tsx`（表单字段、结果展示）
- **后端 API**：`src/app/api/questions/generate/route.ts`（zod schema、入队参数）
- **Worker**：`src/lib/queue/workers/question-gen.ts`（生成流程重写）
- **数据库**：`prisma/schema.prisma` 的 `Question` 模型新增 3 个可选字段，需一次新增列迁移
- **依赖**：复用现有 `recharts`（已是依赖），新增一个轻量 SVG 几何渲染组件（前端内部实现，不引入新 npm 包）；不引入文生图第三方服务
- **AI Provider**：复用现有 `deepseek`（文本生成），不新增 provider
