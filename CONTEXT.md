# edu-agent · Domain Context

## Core Concepts

**Teacher** — 使用本系统的教师用户。通过邮箱或手机号 + 密码登录。首次登录时若账号不存在，系统自动创建（静默注册）。

**身份标识符** — Teacher 有两个可选的唯一标识符：`email`（邮箱）和 `phone`（手机号）。两者均可为空，但至少需填一个。登录时系统自动识别输入类型（含 `@` → 邮箱；11 位纯数字 → 手机号）。

**Session** — next-auth JWT session，保存 teacherId / email / name / subject / role。无 DB session 表，不需要 NextAuth Account/Session/VerificationToken 表。

**Auth Guard** — Next.js middleware，保护页面路由（`/api/*` 除外，由各 API route 自行返回 401）。未登录访问 dashboard → 重定向到 `/login`。

**Credentials Login** — CredentialsProvider（邮箱或手机号 + password）。密码用 bcryptjs 哈希验证。若账号不存在则自动创建（auto-register）。

**Auto-Register** — 用户首次登录时，若邮箱/手机号在数据库中不存在，系统静默创建账号：`name` 默认为邮箱前缀或手机号，`subject` 默认为 `"未设置"`，`role` 默认为 `"teacher"`。用户进入系统后可在设置页完善信息。无需显式注册流程。

## Boundaries

- **In scope**: 登录（邮箱或手机号）、自动注册、退出、路由保护、session 注入 API routes
- **Out of scope**: 独立注册页、邮箱验证、OAuth、多端登录、密码找回（当前阶段）
- **Planned**: 验证码注册（后续迭代）
- **Not implemented yet**: 密码修改（系统设置页暂空）

## Decisions

See `docs/adr/` for full ADR history.
- **ADR-001**: JWT session over DB session（见 docs/adr/ADR-001-jwt-session.md）

---

## 个性化试题生成（Question Generation Customization）

**薄弱知识点 / 良好知识点** — 基于 `StudentMastery.masteryScore` 的二分判定：`< 60` 为薄弱，`≥ 60` 为良好。这个口径已在学生详情页（`students/[id]/page.tsx`）使用，出题功能复用同一口径，不另起标准。

**候选知识点池** — 个性化出题时参与 90/10 抽样的知识点集合：默认是该学生在所选学科/年级下有 `StudentMastery` 记录的全部知识点；若教师手动勾选了知识点，候选池收窄为勾选范围，但范围内仍按 90/10 权重分配，不是均匀分配。

**出题大纲（Outline）** — 出题流程的第一阶段产物，是**草稿级的题干+答案**（不是题型/难度等元数据壳子），按题型分别调用一次 LLM 生成（单选题、填空题、解答题各一次）。图表题在草稿题干+答案基础上派生图表描述。

**逐题生成（Per-item generation）** — 出题流程的第二阶段，严格按大纲逐条把草稿"润色/完整化"为正式题目（补全解题过程、规范表述），并校验是否偏离大纲（题干主旨、答案结论、图表一致性），不是从零另起一道题。单题失败可独立重试，不拖累整批。

**图表题（Chart Question）** — 题干需要配图的题目，分两种生成方式：
- **几何图形 / 数据图表**：用结构化参数 `chartSpec`（JSON）+ 代码渲染（几何用 SVG 渲染器，数据图复用 `recharts`），题干/答案/图形同源，天然图文一致，不调用文生图。
- **实验图**（物理电路图/化学装置图/生物结构图）：当前阶段只产出 `chartImagePrompt` 文字提示词，不真实渲染，标注待人工配图或后续接入文生图——**这是当前明确的非目标，不是遗漏**。

**图表题配额下限** — 一旦教师勾选"需要图表题"，每种题型（数量>0 时）至少分配 1 道图表题，与百分比数值无关；具体算法 `chart_count = max(1, round(count_type × P / 100))`，封顶 `count_type`。
