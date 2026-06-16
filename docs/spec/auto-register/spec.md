---
feature: auto-register
executor: claude-code
scores:  { 规模: S, 风险: M, 项目: 老, 领域清晰度: 清晰 }
nodes:   [NS, N1, N3, N4, N5, N6]
flavors: { N1: grill-with-docs, N3: openspec }
execution_modes: { NS: current-agent, N1: current-agent, N3: current-agent, N5: current-agent, N6: current-agent }
deps_check: { grill-with-docs: ok, openspec: ok, superpowers:test-driven-development: ok, superpowers:verification-before-completion: ok }
status: spec-locked
spec_commit: ""
created: 2026-06-16
---

# auto-register · Spec

## 项目意图与约束         <!-- NS-A Recon -->

- 已决策 ADR：
  - ADR-001: JWT session strategy（无 DB session 表）
  - ADR-002: Silent auto-register on first login（管理员手动建账号模型已废弃）
  - 技术栈：Next.js 15 + TypeScript + Prisma + PostgreSQL + next-auth v4 + bcryptjs + Ant Design v5
  - 密码哈希：bcryptjs（纯 JS，无 native 依赖）
- 活跃演进方向：
  - 刚完成 user-auth（JWT 登录），现在在该基础上叠加自动注册
  - 项目处于快速迭代阶段
- 不可违背的约束：
  - next-auth v4 CredentialsProvider（不升级 v5）
  - App Router 中 getServerSession() 而非 getSession()
  - `Teacher.phone` 已存在但无 `@unique`，需补约束
  - 现有测试账号 `test@school.com` 的数据需保持可用
- Recon 读取的意图文档：CONTEXT.md, ADR-001, ADR-002, prisma/schema.prisma, src/lib/auth.ts, src/app/login/page.tsx

## 涉及服务 / 跨仓范围        <!-- NS-B Scope -->

- 当前项目：edu-agent（Next.js 15 全栈单体，前后端同仓）
- 无外部服务/sibling 仓涉及
- 受影响文件：
  - `prisma/schema.prisma` — email 改可选 + phone 加 @unique（schema 迁移）
  - `src/lib/auth.ts` — authorize() 重写：双标识符查找 + upsert 自动注册
  - `src/app/login/page.tsx` — 输入框改为"邮箱或手机号"，移除 email 格式校验
  - `src/types/next-auth.d.ts` — 可能新增 phone 字段（待确认）
  - `tests/unit/auth-authorize.test.ts` — 新增手机号路径 + 自动注册路径测试
  - `CONTEXT.md` — ✅ 已更新（N1 完成时写入）
  - `docs/adr/ADR-002-silent-auto-register.md` — ✅ 已创建

## 问题与非目标            <!-- N1 -->

**要解决的痛点：**
- 管理员无法通过界面创建教师账号（无产品级入口）
- 新教师无法自助加入系统

**用户是谁：**
- 教师（Teacher）— 首次访问系统，需要通过邮箱或手机号自助注册

**N1 决策记录：**

| 决策点 | 结论 |
|---|---|
| 身份标识符 | email String? @unique，phone String? @unique；含 @ 识别邮箱，11位纯数字识别手机号 |
| 注册默认值 | name = 邮箱前缀或手机号；subject = "未设置"；role = "teacher" |
| 手机号格式 | 11 位纯数字（中国大陆） |
| 安全边界 | 完全开放；后续验证码迭代收口 |
| UI 感知 | 静默注册，直接登录，无额外提示 |
| 错误文案 | 现有账号 + 错误密码 → "账号或密码错误" |

**非目标（Out of Scope）：**
- 独立注册页面
- 邮箱/手机号验证码（下一迭代）
- 密码找回
- OAuth

## 功能需求 & 验收标准      <!-- N3 -->

### FR-001: 双标识符输入

登录页输入框接受邮箱或手机号：
- 含 `@` → 识别为邮箱
- 11 位纯数字 → 识别为手机号
- 其他 → 前端校验拒绝，提示"请输入有效的邮箱或11位手机号"

### FR-002: 自动注册

若输入的邮箱/手机号在数据库中不存在：
- 自动创建 Teacher 记录
- name = 邮箱前缀（`@` 前部分）或手机号
- subject = "未设置"
- role = "teacher"
- password = bcryptjs.hash(输入密码, 10)
- 创建成功后直接建立 session，跳转 `/`

### FR-003: 现有账号登录

若邮箱/手机号已存在：
- 验证 bcryptjs.compare(输入密码, stored hash)
- 通过 → 建立 session，跳转 `/`
- 失败 → 返回"账号或密码错误"

### FR-004: Schema 迁移

`prisma/schema.prisma` 更改：
- `email String @unique` → `email String? @unique`
- `phone String?` → `phone String? @unique`

### NFR-001: 性能

authorize() 中 upsert 逻辑：先 findUnique（email 或 phone），不存在则 create。无额外 DB 往返。

### NFR-002: 向后兼容

现有账号（test@school.com）迁移后仍可正常登录。schema 迁移允许 email 为空但不影响已有非空记录。

## 验收标准（Acceptance Criteria）

| ID | 场景 | 期望结果 |
|---|---|---|
| AC-001 | 新邮箱 + 密码 → 登录 | 自动创建账号，session 建立，跳转 / |
| AC-002 | 新手机号（11位）+ 密码 → 登录 | 自动创建账号，session 建立，跳转 / |
| AC-003 | 已有邮箱 + 正确密码 → 登录 | 正常登录，session 建立 |
| AC-004 | 已有邮箱 + 错误密码 → 登录 | 返回"账号或密码错误" |
| AC-005 | 已有手机号 + 正确密码 → 登录 | 正常登录 |
| AC-006 | 无效格式（如 "abc123"）→ 提交 | 前端校验拒绝，提示错误 |
| AC-007 | 相同邮箱第二次登录 | 不重复创建账号，返回同一 Teacher 记录 |
| AC-008 | auto-register 后 /api/teacher | 返回新创建 teacher 数据（含默认 name/subject） |

## 任务拆解                <!-- N4 — openspec tasks -->

N/A（待 N3 定稿后由 openspec 生成）

## 实现记录               <!-- N5 -->

N/A

## 验证结果               <!-- N6 -->

N/A

## 归档                  <!-- N8 -->

N/A
