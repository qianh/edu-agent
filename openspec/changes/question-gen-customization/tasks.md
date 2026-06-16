## 1. 数据模型

- [ ] 1.1 `prisma/schema.prisma`：`Question` 模型新增 `isChart Boolean @default(false)`、`chartSpec Json?`、`chartImagePrompt String?`
- [ ] 1.2 运行 `pnpm prisma migrate dev --name add_question_chart_fields` 生成并应用迁移
- [ ] 1.3 确认迁移只新增列，`pnpm prisma studio` 或查询历史 `Question` 记录验证旧数据未受影响

## 2. API（`src/app/api/questions/generate/route.ts`）

- [ ] 2.1 重写 `genSchema`：`studentId` 必填（cuid），`knowledgePointIds` 改为可选数组，新增按题型计数对象（如 `counts: { single: number, fill: number, answer: number }`，每项 min 0），新增 `chartEnabled: boolean`、`chartPercentage`（`chartEnabled=true` 时必填，0-100）
- [ ] 2.2 更新 `questionGenQueue.add` 传参，确保新字段透传给 worker
- [ ] 2.3 `GET` 接口按需补充返回新字段（`isChart`/`chartSpec`/`chartImagePrompt`），供前端展示用

## 3. Worker — 知识点抽样与图表配额（`src/lib/queue/workers/question-gen.ts`）

- [ ] 3.1 新增候选知识点池查询：按 `studentId` + `subject`/`grade` 查 `StudentMastery`（手选 `knowledgePointIds` 时进一步过滤），按 `masteryScore < 60` / `>= 60` 拆分薄弱/良好两组
- [ ] 3.2 实现 90/10 抽样函数：薄弱组不足时允许重复抽取；薄弱组为空时整体降级为良好组，返回降级标记
- [ ] 3.3 实现图表配额函数：`chartCount(countType, percentage) = countType === 0 ? 0 : Math.min(countType, Math.max(1, Math.round(countType * percentage / 100)))`
- [ ] 3.4 单元测试覆盖 3.2/3.3 的边界情况（薄弱点不足、薄弱点为空、百分比换算<1、数量为0）

## 4. Worker — 两阶段生成流程

- [ ] 4.1 实现大纲生成：按题型分别调用 `deepseek.generateText`，输出该题型的草稿题干+答案数组（图表题额外要求 LLM 给出几何/数据图的结构化描述或实验图提示词），失败整体重试 ≤2 次
- [ ] 4.2 几何/数据图大纲结果转换为 `chartSpec`（结构化 JSON），实验图大纲结果转换为 `chartImagePrompt`（文本）
- [ ] 4.3 实现逐题生成：按大纲逐条调用 LLM 润色/完整化为正式题目，单题失败重试 ≤2 次
- [ ] 4.4 实现逐题校验：校验生成结果是否偏离大纲（题干主旨/答案结论/图表数据一致性），校验失败计入该题重试次数
- [ ] 4.5 单题重试耗尽后跳过，不写入草稿库；任务结果记录 `{ total, succeeded, skipped: [...] }`
- [ ] 4.6 候选知识点池为空（无 mastery 记录）或降级为良好知识点出题时，在任务结果中附加提示信息

## 5. 前端表单（`src/app/(dashboard)/questions/generate/page.tsx`）

- [ ] 5.1 题型区域改为三个独立 `InputNumber`（单选题/填空题/解答题数量），移除原单选 `Tag.CheckableTag` 题型选择
- [ ] 5.2 新增"学生"`Select`（必选，数据源新增 `/api/students` 已有接口或现有学生列表接口）
- [ ] 5.3 "知识点"`Select` 改为非必填（`rules` 去掉 `required`），placeholder 提示"不选则按学生学情自动抽样"
- [ ] 5.4 新增"图表题"勾选框 + 百分比 `InputNumber`（勾选后才显示，0-100）
- [ ] 5.5 提交逻辑改造：组装按题型计数对象 + `chartEnabled`/`chartPercentage` + `studentId`，替换原 `type`/`count` 字段

## 6. 前端结果展示

- [ ] 6.1 新增轻量 SVG 几何渲染组件（支持三角形/四边形/圆/坐标系/数轴等常见图形，输入为 `chartSpec`），渲染失败时降级展示纯文字提示词
- [ ] 6.2 数据图表类 `chartSpec` 复用 `recharts` 渲染
- [ ] 6.3 结果表格 `expandable` 区域：`isChart=true` 时按 `chartSpec` 渲染图形或展示 `chartImagePrompt` 文本

## 7. 测试

- [ ] 7.1 `tests/` 新增 3.2/3.3 抽样与配额函数的单元测试（vitest）
- [ ] 7.2 新增 API route 的 zod schema 校验测试（合法/非法 payload）
- [ ] 7.3 视情况补充 e2e（playwright）覆盖表单新字段的基本交互（学生必选校验、图表题百分比显示/隐藏）

## 8. 验证

- [ ] 8.1 `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 全部通过
- [ ] 8.2 手动验证：选学生不选知识点 → 生成结果知识点分布符合 90/10
- [ ] 8.3 手动验证：勾选图表题 + 百分比 → 每种数量>0的题型至少 1 道图表题
- [ ] 8.4 手动验证：几何/数据图题在结果区正确渲染图形；实验图题展示提示词文本
- [ ] 8.5 手动验证：故意构造薄弱知识点为空的学生，确认降级提示正确显示
