---
feature: remove-mock-data
executor: claude-code
scores: { 规模: M, 风险: L, 项目: 老, 领域清晰度: M }
nodes: [NS, N1, N3, N4, N5, N6, N7]
flavors: { N1: grill-with-docs, N3: openspec, N4: writing-plans, N5: test-driven-development, N7: requesting-code-review }
execution_modes: { all: current-agent }
deps_check: { all: ok }
status: spec-locked
created: 2026-06-15
---

# remove-mock-data · Spec

## 涉及服务 / 跨仓范围

- 当前项目：Next.js 全栈（前端页面 + API routes）`/Users/hong/John/ai/edu-agent`
- 数据库：Prisma ORM → SQLite/PostgreSQL，模型：Teacher, Student, Submission, Assignment, KnowledgePoint
- 受影响前端文件（5个）：
  - `src/app/(dashboard)/class-dashboard/page.tsx` — MOCK_TREND + STAT_CARDS
  - `src/app/(dashboard)/knowledge/points/page.tsx` — MOCK_POINTS
  - `src/app/(dashboard)/settings/page.tsx` — 王老师 + 系统统计
  - `src/app/(dashboard)/layout.tsx` — 王老师 + avatar
  - `src/app/(dashboard)/page.tsx` — INIT_MESSAGES + 王老师
- 已有 API（无需改动）：`/api/students`, `/api/knowledge/points`, `/api/assignments`, `/api/classes`
- 需新建 API 端点：
  - `/api/class-dashboard/trend` — 周成绩趋势（from Submission）
  - `/api/teacher` — 当前教师信息（findFirst）
  - `/api/stats/monthly` — 本月批改量 + 出题量

## 问题与非目标

**要解决的问题：**
- 所有业务页面展示的是写死的假数据，与数据库真实状态脱节。
- "王老师"硬编码导致多人使用时展示错误身份。

**非目标（明确不做）：**
- 不引入 auth/session 系统（教师用 findFirst 兜底）
- 不动 QUICK_REPLIES / QUICK_SUGGEST（UI 配置，非数据）
- 不动导航菜单 MENU_ITEMS
- 不动通知设置开关的默认值
- 不动 AI 偏好设置的默认值
- 不动系统版本 / AI 模型名称（合理静态配置）
- 不实现存储空间查询（改为 `—`）

**失败路径：**
- 数据库连接失败 → 页面显示空状态/loading，不崩溃
- Teacher 表为空 → 姓名显示为空字符串或 `—`，不抛异常
- 无 Submission 记录 → 趋势图显示"暂无数据"，统计卡显示 `—`

## 需求

**FR-001** 删除 `MOCK_POINTS`，`knowledge/points/page.tsx` 改用 `useSWR('/api/knowledge/points')` 获取数据；空库时表格显示空状态。

**FR-002** 删除 `MOCK_TREND`，`class-dashboard/page.tsx` 改用 `useSWR('/api/class-dashboard/trend')` 获取周趋势数据；无数据时图表显示"暂无批改数据"占位。

**FR-003** `STAT_CARDS` 中的硬编码数值（78.6分、92.4%、63.8%、42份）改为从 `/api/class-dashboard/trend` 的聚合字段中读取；无数据时显示 `—`。

**FR-004** 新建 `GET /api/class-dashboard/trend`，返回：
```json
{
  "trend": [{ "week": "6/9", "avg": 78, "highest": 95, "lowest": 55 }],
  "stats": { "avg": 78, "excellentRate": 42.3, "passRate": 86.2, "weeklySubmit": 12 }
}
```
数据来源：`Submission.totalScoreConfirmed`，按周分组。

**FR-005** 新建 `GET /api/teacher`，返回 `prisma.teacher.findFirst()` 的结果（id, name, subject, grade, email 等字段）；无记录时返回 `null`。

**FR-006** 新建 `GET /api/stats/monthly`，返回本月（自然月 1 日起）的：
```json
{ "submissions": 128, "assignments": 56 }
```
数据来源：`Submission.count` + `Assignment.count`，`createdAt >= 本月1号`。

**FR-007** `layout.tsx` 和 `page.tsx` 和 `settings/page.tsx` 用 `useSWR('/api/teacher')` 获取教师名，替换所有"王老师"和 avatar "王" 硬编码。

**FR-008** 首页 `INIT_MESSAGES` 的"今天有 N 份作业待批改，M 名学生需要关注"用真实数据：
- 作业数：`/api/assignments?status=pending`（或 needsReview=true 的 Submission count）
- 学生数：`/api/students?riskLevel=high` 的 total

**FR-009** `settings/page.tsx` 系统信息卡：本月批改量 + 本月出题量改用 `/api/stats/monthly`；存储空间改为显示 `—`。

**NFR-001** 所有新 API 端点：错误时返回标准 errorResponse 格式，HTTP 500。

**NFR-002** 数据加载中显示 Ant Design Skeleton 或 loading 状态，不闪烁。

## 数据模型 / API

| 端点 | 来源模型 | 关键字段 |
|---|---|---|
| `GET /api/class-dashboard/trend` | Submission | totalScoreConfirmed, createdAt, studentId |
| `GET /api/teacher` | Teacher | id, name, subject, grade, email |
| `GET /api/stats/monthly` | Submission + Assignment | count by createdAt >= 月初 |

## 验收标准

**AC-001** 知识点页面：删除 `MOCK_POINTS`，表格数据来自 `/api/knowledge/points`；空库时显示 Ant Design 空状态。

**AC-002** 班级看板趋势图：删除 `MOCK_TREND`，图表数据来自 `/api/class-dashboard/trend`；无 Submission 时图表区域显示"暂无批改数据"文字。

**AC-003** 班级看板统计卡：78.6/92.4%/63.8%/42 替换为真实计算值；无数据时显示 `—`。

**AC-004** layout/settings/首页中"王老师"全部替换为 `/api/teacher` 返回的 name；Teacher 表为空时显示空字符串。

**AC-005** 首页问候语中的作业数和学生数为真实值。

**AC-006** settings 系统信息：本月批改量/出题量为真实值，存储空间显示 `—`。

**AC-007** TypeScript 无新 type error，`pnpm build` 通过。

## 测试策略

- 单元：不适用（无纯函数逻辑新增）
- 集成：手动测试各页面空库 vs 有数据两种状态
- E2E：不要求（超出本次范围）
- 手工验收：按 AC-001 ～ AC-007 逐条核对

## 任务拆解

N/A（N4 节点将填充）

## 实现与测试记录

N/A（N5 节点将填充）

## 验证记录（DoD）

- [ ] 所有测试通过  [ ] lint  [ ] typecheck  [ ] build
- [ ] 无无关 diff  [ ] 无绕过测试

## 审查记录

N/A（N7 节点将填充）

## 决策与归档（ADR）

N/A（N8 节点将填充）
