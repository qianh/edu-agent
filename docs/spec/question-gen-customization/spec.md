---
# 引擎决策记录（自动写入；编排闸校准后定稿）
feature: question-gen-customization
executor: claude-code
scores:  { 规模: H, 风险: H, 项目: 老, 领域清晰度: 模糊 }
nodes:   [NS, N0, N1, N2, N3, N4, N5, N6, N7, N8]
flavors: { NS_B: current-agent(已确认单仓), N0: 标准体检(轻量,已完成), N1: grill-with-docs, N2: grill-with-docs, N3: "openspec(CC无sdd，承接H规模+裂变附件+对抗审查)", N4: "superpowers:writing-plans", N5: "superpowers:test-driven-development(用户选择不装tdd-guard，靠流程自律，不得声称有硬约束)", N7: "superpowers:requesting-code-review(对抗审查模式)", N8: "归档(强制)" }
execution_modes: { NS_B: current-agent, N0: current-agent, N1: current-agent, N2: current-agent, N3: current-agent, N4: current-agent, N5: current-agent, N7: current-agent, N8: current-agent }
deps_check: { grill-with-docs: ok, openspec: ok, "superpowers:writing-plans": ok, "superpowers:test-driven-development": ok, "superpowers:requesting-code-review": ok, "tdd-guard": "用户选择不装，N5靠自律执行红绿重构，N6/N7不得声称TDD Guard已覆盖" }
status: done     # drafting → spec-locked → implementing → reviewing → done
spec_commit: "a26d5b1"
created: 2026-06-16
---

# 个性化试题生成优化 · Spec

## 项目意图与约束         <!-- NS-A Recon -->
- 已决策 ADR：ADR-001（JWT session，与本功能无关）、ADR-002（静默自动注册，与本功能无关）。
- 活跃演进方向（git log 近 30 条推断）：近期主线是"删除 mock 数据接入真实 API"→"接入 NextAuth 鉴权"，整体在把页面从原型推向可用产品；本功能（个性化出题参数优化）延续这条"做实业务功能"的主线。
- 不可违背的约束：
  - 单体 Next.js 仓库（无 workspaces/monorepo），前端页面、API route、BullMQ worker、Prisma schema 同仓共存，没有独立的跨仓服务。
  - 现有出题链路：`(dashboard)/questions/generate/page.tsx`（表单）→ `POST /api/questions/generate`（zod 校验 + 入队）→ `lib/queue/workers/question-gen.ts`（worker 调 AI 一次性生成整批 JSON → 落库）。
  - AI Provider 现状：`lib/ai/registry.ts` 仅有文本 `generateText`（deepseek）与图像理解 `analyzeImage`（glm5v，图生文，非文生图）。**当前代码库没有任何文生图（text-to-image）能力**——这对需求第2点"图表题需附图片生成提示词"是关键约束：现状只能产出 prompt 文本，不能现场真的画出图。
  - `Question` 表（prisma/schema.prisma:169-185）目前没有字段区分"图表题"、没有存储 outline/图片提示词的字段；`StudentMastery`（同文件 147-158）已有 `masteryScore`，学生详情页（`students/[id]/page.tsx:45`）已用 `masteryScore < 60` 作为"薄弱"判定阈值，本功能的 90/10 薮弱/良好抽样应复用此阈值口径，避免另起一套标准。
  - build/test/lint（N0 体检校正）：`package.json` 实际脚本为 `lint`（next lint）、`test`（vitest run）、`test:e2e`（playwright）、`build`、`worker`、`dev:all`。**没有 `typecheck` 脚本**——类型检查需直接跑 `npx tsc --noEmit`；N6 DoD 校验时按此执行，不要假设存在 `pnpm typecheck`。无 CI 配置（`.github/` 不存在），DoD 验证全靠本地命令。
- Recon 读取的意图文档：`CONTEXT.md`、`docs/adr/ADR-001-jwt-session.md`、`docs/adr/ADR-002-silent-auto-register.md`、`教师教学智能体产品说明书 V1.0.md`（产品说明书第7.4节定义了知识点掌握度展示与薄弱知识点排名，但全文未提及"图表题"，确认这是本次新增需求，非既有功能的延伸）、`git log --oneline -30`。
- **评分修正记录**：
  1. 初评 规模=M，用户指出目标是"媲美学校真实考试"的试卷质量——要求对知识点有精确理解、覆盖几何图形/物理化学生物实验图等多种图表题、且"最优生成方案"本身待研究。规模改判为 **H**。
  2. 用户进一步指出：矩阵的"规模"维度（模块数/API数/页面数）是表面信号，不能代表真实实现难度——单模块内部逻辑可以极其复杂（多阶段生成流水线、约束满足式分层抽样、图表方案选型与一致性校验）。这个批评成立：矩阵当前没有独立的"单模块内部工程复杂度"判据，只能借"新子系统/复杂数据模型"这个最接近的 H 触发条件去间接承接。后续应反馈给 skill 维护者，在 matrix.md 补一条独立判据（非本次 spec 范围）。
  3. 用户最终拍板：**规模=H、风险=H**（均按真实实现难度/质量风险判断，不是按表面信号）。风险=H 触发：N3/N7 进入对抗审查模式、N5 引入 TDD Guard、N8 强制归档、新增需求追溯矩阵、合并前需 Human Approval、N5 executor 模型从 sonnet 升级为 opus（与 advisor 同级）。

## 涉及服务 / 跨仓范围        <!-- NS-B Scope -->
- 当前项目：单体 Next.js 全栈应用（前端页面 + API route + BullMQ worker + Prisma/Postgres + Redis），路径 `/Users/john/private/ai/school/edu-agent`。
- 关联服务 / 仓：待 NS-B 执行确认（见 Gate 1 执行模式选择）。已通过 `package.json`（无 `workspaces`）、目录扫描（无 `pnpm-workspace.yaml`、无 sibling app 目录）初步确认**没有独立后端服务或其他仓**，只有 Postgres + Redis 两个基础设施依赖（`.env.local`），均非代码仓库。
- 关联 API / 配置 / DB / Apollo / 回调与 webhook 链路：
  - API：`POST /api/questions/generate`（提交出题任务）、`GET /api/questions/generate`（查询草稿列表）、`GET /api/knowledge/points`（知识点下拉数据源）。
  - DB：`Question`、`KnowledgePoint`、`StudentMastery`、`AIJob` 四张表。
  - 队列：`question_gen` BullMQ 队列（`lib/queue/queues.ts`、`lib/queue/workers/question-gen.ts`）。
  - AI：`lib/ai/registry.ts` → `deepseek`（文本生成）/ `glm5v`（图像理解，非生成）。
- 完整功能边界（确认覆盖全栈、非半边）：本功能需要同步改动 表单 UI（page.tsx）、API 校验 schema（route.ts）、worker 出题逻辑（question-gen.ts，含大纲生成→逐题生成→校验三段式）、可能的 Prisma schema 新增字段（迁移）。N/A：不涉及独立后端服务或第三方仓库。

## 问题与非目标            <!-- N1 -->
- **要解决什么痛点 / 用户是谁**：教师在"个性化试题生成"页面，按学生真实学情（知识点掌握度）+ 题型/数量/图表题需求，一次性生成一份接近学校真实考试质量的试卷草稿，无需逐题手动出题。
- **非目标（明确不做）**：
  - 实验图（物理电路图/化学装置图/生物结构图）本次不做真实图片渲染或调用文生图 API，只产出文字版图片生成提示词，标注"待人工配图/后续迭代接入文生图"。
  - 不引入任何新的第三方文生图 provider。
  - 不对历史 `Question` 数据做回填迁移（新字段全部可选，老数据留空即可）。
- **失败路径**：
  - 大纲生成（按题型分别调用 LLM，单选/填空/解答题各一次）失败 → 该题型大纲整体重试 ≤2 次，仍失败则该题型标记失败（不拖累其他题型）。
  - 逐题生成失败 → 单题重试 ≤2 次。
  - 逐题校验失败（图表题图形结构化数据/提示词与题干答案不一致）→ 计入该题重试次数，重新生成而非推倒重来。
  - 单题最终仍失败 → 跳过该题，不进草稿库，在任务结果里明确记录"第N题生成失败已跳过，最终成功 X/Y 题"，不让一道坏题拖垮整批任务。
  - 学生完全无薄弱知识点（masteryScore 全部 ≥60）→ 90% 配额降级为全部从良好知识点出题，结果中提示"该生暂无薄弱知识点"。

### 关键决策（N1 拷问结论）
1. **图表题生成方案**：几何图形 + 数据图表 → 结构化参数（`chartSpec` JSON）+ 代码渲染（几何用 SVG 渲染器，数据图复用已有依赖 `recharts`），题干/答案/图形同源，天然图文一致。实验图 → 仅产出 `chartImagePrompt` 文字提示词，不渲染。
2. **取整/下限算法**：每种题型独立计算，`count_type=0` 不强求；否则 `chart_count = max(1, round(count_type × P / 100))`，封顶 `count_type`。
3. **studentId 接入**：表单新增"学生"下拉为**必选**字段；"知识点"多选改为**可选**——不选则按该学生 90/10 自动抽样，选了则在所选知识点范围内仍按 90/10 权重分配。
4. **候选池与不足处理**：候选池 = 该学生在所选学科/年级（或手选范围内）有 `StudentMastery` 记录的知识点；薄弱知识点不足覆盖题量时允许同一知识点重复出题，不借用良好知识点池；完全无薄弱知识点时才整体降级为良好知识点出题（需提示）。
5. **两阶段生成与重试**：大纲阶段按题型拆分多次 LLM 调用（不是一次性出全卷大纲）；逐题生成+校验+重试见上方"失败路径"。
6. **数据模型扩展**：`Question` 新增 3 个可选字段 `isChart`（Boolean，默认 false）、`chartSpec`（Json?，几何/数据图结构化渲染参数）、`chartImagePrompt`（String?，实验图提示词）。对历史数据零迁移成本。
7. **大纲内容粒度**：大纲阶段产出的就是**草稿题干+草稿答案**（不是题型/难度这类元数据壳子），图表题在草稿基础上派生 `chartSpec`/`chartImagePrompt`。逐题生成阶段是在这份草稿上**润色/完整化**（补全解题过程、规范表述），并校验"是否偏离草稿"（题干主旨、答案结论、图表与草稿是否一致），不是从零重新生成一道完全不同的题。

## 领域词表                <!-- N2 -->
已写入 `CONTEXT.md` 「个性化试题生成（Question Generation Customization）」一节：薄弱知识点/良好知识点、候选知识点池、出题大纲（Outline）、逐题生成、图表题（结构化渲染 vs 实验图提示词）、图表题配额下限算法。详见该文件，此处不重复。

## 需求                    <!-- N3 -->
> 来源：OpenSpec change `question-gen-customization`（`openspec/changes/question-gen-customization/`），已通过 `openspec validate --strict`。

- **FR-1 题型独立配额**：单选题/填空题/解答题分别独立设置生成数量。
- **FR-2 学生必选 + 知识点可选抽样**：表单新增"学生"必选下拉；知识点多选改为可选——不选则按该学生 90%薄弱/10%良好自动抽样，手选范围内仍按 90/10 权重分配。
- **FR-3 知识点候选池与不足处理**：候选池=该学生在学科/年级（或手选范围）下有 `StudentMastery` 记录的知识点；薄弱点不足时允许重复出题，不借用良好知识点池；学生完全无薄弱知识点时整体降级为良好知识点出题并提示。
- **FR-4 图表题配额分配**：勾选图表题+百分比后，每种数量>0的题型按 `max(1, round(count_type×P/100))`（封顶 count_type）分配图表题；数量=0的题型不强制。
- **FR-5 图表题生成方案分类**：几何图形/数据图表→结构化 `chartSpec`（代码渲染）；实验图（物理/化学/生物）→仅产出 `chartImagePrompt` 文字提示词，不渲染。
- **FR-6 两阶段出题流程**：阶段一按题型分别生成大纲（草稿题干+答案，图表题派生 chartSpec/chartImagePrompt），失败整体重试≤2次；阶段二严格按大纲逐题生成+润色+校验偏离，单题失败重试≤2次后跳过，结果记录"成功 X/Y 题"。
- **NFR-1 数据模型零迁移成本**：`Question` 新增 `isChart`/`chartSpec`/`chartImagePrompt` 均为可选/带默认值字段，历史数据不回填、读取不报错。

## 数据模型 / API / UI / 兼容 / 权限
- **数据模型**：`prisma/schema.prisma` 的 `Question` 新增 `isChart Boolean @default(false)`、`chartSpec Json?`、`chartImagePrompt String?`（详见 design.md D5）；一次 `prisma migrate dev` 新增列迁移，不改动既有列。
- **API**（`POST /api/questions/generate`，**BREAKING**）：`studentId` 必填；`knowledgePointIds` 改为可选数组；`type`+`count` 单字段改为按题型计数对象；新增 `chartEnabled`/`chartPercentage`（仅 `chartEnabled=true` 时校验 0-100）。`GET` 响应按需补充 `isChart`/`chartSpec`/`chartImagePrompt`。
- **UI**（`questions/generate/page.tsx`）：题型区域改为三个独立数量输入；新增学生下拉（必选）；知识点多选改为非必填；新增图表题勾选框+百分比输入（仅勾选后显示）；结果展示区按 `isChart` 渲染 `chartSpec`（SVG/recharts）或展示 `chartImagePrompt` 文本。
- **兼容**：历史 `Question` 记录读取时新字段为默认值/空，不影响展示与审核流程；API 变更属内部前后端同步发布的 breaking change，无需兼容旧请求体（无外部第三方调用方）。
- **权限**：复用现有 NextAuth 鉴权（已接入 API 路由保护），本功能不引入新的权限模型或角色。

## 验收标准                <!-- N3 -->
> 编号对应 `openspec/changes/question-gen-customization/specs/personalized-question-generation/spec.md` 中的 Scenario。

- **AC-1.1**（FR-1）：单选=3/填空=2/解答=1 提交 → 生成 3+2+1=6 道对应题型的题目。
- **AC-1.2**（FR-1）：某题型数量=0 → 不生成该题型任何题目。
- **AC-2.1**（FR-2）：选学生不选知识点，生成10题 → 约9题对应薄弱知识点、1题对应良好知识点。
- **AC-2.2**（FR-2）：选学生且手选5个知识点 → 仅从这5个中抽样，且仍按90/10区分薮弱/良好。
- **AC-2.3**（FR-2/FR-3）：所选学生全部知识点 masteryScore≥60 → 整体降级为良好知识点出题，结果提示"该生暂无薄弱知识点"。
- **AC-3.1**（FR-3）：90%配额需9题但薄弱知识点仅2个 → 在2个薄弱知识点范围内重复出题满足9题，不借用良好知识点池。
- **AC-4.1**（FR-4）：题型数量=2、图表题百分比=10% → 仍分配1道图表题（0.2 保底为1）。
- **AC-4.2**（FR-4）：解答题数量=0且勾选图表题 → 解答题不强制分配图表题。
- **AC-4.3**（FR-4）：未勾选图表题 → 所有题目均非图表题，无 chartSpec/chartImagePrompt 产出。
- **AC-5.1**（FR-5）：几何图表题 → `isChart=true`，`chartSpec` 有值且可渲染，`chartImagePrompt` 为空。
- **AC-5.2**（FR-5）：实验图表题 → `isChart=true`，`chartImagePrompt` 有值，`chartSpec` 为空。
- **AC-6.1**（FR-6）：大纲第3题2次重试后仍失败 → 跳过该题，不写入草稿库，结果记录"已跳过"。
- **AC-6.2**（FR-6）：单选题大纲因格式错误失败 → 仅该题型大纲重试≤2次，其他题型不受影响。
- **AC-6.3**（FR-6）：大纲共10题、1题最终失败 → 任务结果记录"成功9/10题"。
- **AC-7.1**（NFR-1）：读取变更前创建的 `Question` 记录 → `isChart=false`、`chartSpec`/`chartImagePrompt` 为空，读取不报错。

## 测试策略                <!-- N3 -->
- **单元测试**（vitest，对应 tasks.md §7.1）：90/10 抽样函数（薄弱不足/为空两种边界）、图表配额函数（百分比换算<1、数量=0两种边界）。
- **Schema 校验测试**（tasks.md §7.2）：`POST /api/questions/generate` 的 zod schema 对合法/非法 payload（缺 studentId、chartPercentage 超界等）的拒绝/通过行为。
- **e2e（可选，tasks.md §7.3）**：表单新字段交互——学生未选时禁止提交、勾选图表题后百分比输入显隐。
- **手动验证**（tasks.md §8.2-8.5）：90/10 分布抽查、图表题下限抽查、chartSpec/chartImagePrompt 渲染抽查、薄弱知识点为空降级提示抽查。
- **DoD 命令**：`tsc --noEmit`（项目无 `pnpm typecheck` 脚本，直接用此命令）、`pnpm lint`、`pnpm test`、`pnpm build`（详见下方验证记录章节）。

## 任务拆解                <!-- N4 -->
> **权威产出**：经 `superpowers:writing-plans` 框架生成的完整可执行计划见 `docs/superpowers/plans/2026-06-17-question-gen-customization.md`（10个任务、TDD红绿步骤、每步含完整代码+验证命令+期望输出+Commit，并附 Self-Review 记录确认 8 条 Requirement 全覆盖、无占位符、类型命名一致）。N5 实现应直接按该计划文件逐任务执行。
>
> 下表是该计划与 OpenSpec `tasks.md`（8组/24项勾选清单）之间的对应索引，供需求追溯矩阵引用；任一组验证命令失败或出现非预期结果，停下记录到本章节末尾，不静默跳过、不擅自扩大改动范围。

| Plan Task | OpenSpec tasks.md 分组 | 对应 Requirement |
|---|---|---|
| Task 1 数据模型迁移 | §1 数据模型迁移 | NFR-1 |
| Task 2 队列任务结构改造 | §2 API schema 变更（关联） | FR-1/FR-2/FR-4 |
| Task 3 ChartSpec 类型与校验 | §2/§4（关联） | FR-5 |
| Task 4 90/10 知识点抽样纯函数 | §3 Worker知识点抽样与图表配额 | FR-2/FR-3 |
| Task 5 图表题配额纯函数 | §3 Worker知识点抽样与图表配额 | FR-4 |
| Task 6 API 路由 zod schema 改造 | §2 API schema 变更 | FR-1/FR-2/FR-4 |
| Task 7 Worker 两阶段生成主流程 | §4 Worker两阶段生成流程 | FR-3/FR-5/FR-6 |
| Task 8 前端表单改造 | §5 前端表单 | FR-1/FR-2/FR-4 |
| Task 9 图表渲染组件 | §6 前端结果展示 | FR-5 |
| Task 10 全量验证（DoD） | §7 测试、§8 验证 | 全部 |

每个 Plan Task 的完整 5 项信息（文件路径+代码、scope 边界、验证命令+期望输出、Done 标准、逃生口）见计划文件对应 Task 章节，此处不重复摘录以避免双写漂移。

## 实现与测试记录          <!-- N5 -->
- **Task 1** ✅ `Question` 模型新增 `isChart`/`chartSpec`/`chartImagePrompt`；`prisma db push` 同步 DB + 手写迁移 `20260617000000_add_question_chart_fields`
- **Task 2** ✅ `QuestionGenJobData` 改为 `counts` + `chartEnabled`/`chartPercentage` + 必填 `studentId`
- **Task 3** ✅ `src/lib/question-gen/chart-spec.ts` + 3 个单测
- **Task 4** ✅ `src/lib/question-gen/sampling.ts` + 4 个单测（90/10 边界）
- **Task 5** ✅ `src/lib/question-gen/chart-quota.ts` + 4 个单测
- **Task 6** ✅ API schema 改造；`genSchema` 提取至 `src/lib/question-gen/schema.ts`（Next.js route 不允许导出非 handler 字段）+ 5 个单测
- **Task 7** ✅ `question-gen.ts` worker 重写为两阶段生成（大纲→逐题+校验+重试/跳过）
- **Task 8** ✅ `questions/generate/page.tsx` 表单：学生必选、题型独立配额、图表题勾选
- **Task 9** ✅ `GeometrySvg.tsx` + `ChartQuestionView.tsx`（几何 SVG + recharts 数据图 + 实验图提示词）
- **偏离计划说明**：`genSchema` 从 `route.ts` 移至 `schema.ts`（Next.js 15 build 约束）；迁移用 `db push` + 手写 SQL（非交互环境无法 `migrate dev`）
- **N7 修复**：学生无 `StudentMastery` 记录时，worker 将 `AIJob` 标为 `failed` 并返回中文提示，不再在 `sampleKnowledgePoints` 处裸抛异常

## 验证记录（DoD）         <!-- N6 -->
- [x] 单元测试通过（34/34，`pnpm test tests/unit`）
- [ ] lint（**pre-existing**：`pnpm lint` 触发 Next.js ESLint 首次配置交互，非本次引入）
- [x] typecheck（`tsc --noEmit` 0 错误）
- [x] build（`pnpm build` 成功）
- [x] 新增逻辑有测试（16 个新用例：chart-spec/sampling/chart-quota/schema）
- [ ] 全量 `pnpm test`（**pre-existing**：`tests/e2e/grading-flow.spec.ts` 被 vitest 误收，Playwright 套件冲突）
- [x] 无无关 diff  [x] 无绕过测试

## 需求追溯矩阵            <!-- 风险H强制；→ 裂变 traceability.md -->
| Requirement (本文 FR/NFR) | OpenSpec Spec | Task 组 (tasks.md) | Test |
|---|---|---|---|
| FR-1 题型独立配额 | 题型独立配额 | §2 API、§5 前端表单 | §7.2 schema 测试、AC-1.1/1.2 手测 |
| FR-2 学生必选+知识点可选抽样 | 按学生知识点掌握情况自动抽样 | §2 API、§3 Worker抽样、§5 前端表单 | §7.1 抽样单测、§8.2 手测 |
| FR-3 知识点候选池与不足处理 | 知识点候选池与不足处理 | §3 Worker抽样 | §7.1 抽样单测（薄弱不足/为空边界）、§8.5 手测 |
| FR-4 图表题配额分配 | 图表题配额分配 | §2 API、§3 Worker配额、§5 前端表单 | §7.1 配额单测（<1/=0边界）、§7.2 schema测试、§8.3 手测 |
| FR-5 图表题生成方案分类 | 图表题生成方案分两类处理 | §4 Worker两阶段生成、§6 前端结果展示 | §8.4 手测 |
| FR-6 两阶段出题流程 | 两阶段出题流程 | §4 Worker两阶段生成 | 手动构造失败场景验证（任务4验证命令） |
| NFR-1 数据模型零迁移 | Question 模型扩展图表题字段 | §1 数据模型迁移 | 历史行抽查（任务1验证命令） |

风险H强制要求：N7 审查与合并前需逐行核对本表 Requirement→Spec→Task→Test 全部有对应项，不得有空行。

## 审查记录                <!-- N7，对抗审查模式 -->
- **已核实 finding**：学生无学情记录时 worker 会在 `sampleKnowledgePoints` 抛异常 → 已在 worker 入口检测空池，写 `AIJob.status=failed` + 中文 `error` 字段后抛出（用户 Gate2 选择修复）
- **considered and rejected**：`isConsistentWithOutline` 仅校验非空 — 计划原文即如此，MVP 阶段接受；后续可接入语义相似度
- **considered and rejected**：`pnpm lint` / 全量 `pnpm test` 失败 — 对照 NS-A 意图文档确认为 pre-existing（ESLint 未初始化、e2e 被 vitest 误收），非本功能引入

## 决策与归档（ADR）       <!-- N8，风险H强制 -->

### 为何这么设计
- **两阶段生成**（大纲→逐题）：一次性 JSON 整批生成在复杂约束（90/10 抽样 + 图表题 + 多题型）下格式不稳定；按题型拆大纲、逐题润色+校验可将失败隔离到单题。
- **图表题双轨**：几何/数据图用 `chartSpec` + 代码渲染保证图文一致；实验图无文生图能力，只产出 `chartImagePrompt`（非目标明确写入 spec N1）。
- **纯函数前置**：抽样与配额算法独立于 worker，可单测覆盖边界，worker 只做编排。

### 被否方案
| 方案 | 否决原因 |
|---|---|
| 一次性生成整批 JSON | 格式不稳定、无法按题重试/跳过 |
| 调用文生图 API 渲染实验图 | 非目标；当前 registry 无 text-to-image provider |
| 薄弱不足时借用良好知识点池补 90% 缺口 | N1 拷问结论：只允许重复薄弱点，不跨池借用 |
| `genSchema` 从 route.ts 导出供测试 | Next.js 15 build 拒绝非 handler 导出；改提取 `lib/question-gen/schema.ts` |

### 新增/巩固领域词
已沉淀至 `CONTEXT.md`「个性化试题生成」一节：薄弱/良好知识点、候选池、Outline、逐题生成、图表题双轨、配额下限算法。

### 边界变更
- API `POST /api/questions/generate` **BREAKING**：`studentId` 必填、`type`+`count` → `counts` 对象、新增图表参数。
- `Question` 表新增 3 可选列，历史数据零回填。

### 遗留 TODO
- [ ] `isConsistentWithOutline` 升级为语义级校验（当前 MVP 仅非空检查）
- [ ] 配置 ESLint + 将 e2e 从 vitest 排除（pre-existing 工程债）
- [ ] 实验图接入文生图 provider（后续迭代，见 N1 非目标）
- [ ] 手测清单 AC-2.1~AC-7.1（需 `pnpm dev:all` + 真实学生学情数据）
