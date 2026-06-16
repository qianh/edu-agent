---
feature: user-auth
executor: claude-code
scores:  { 规模: M, 风险: H, 项目: 老, 领域清晰度: 清晰 }
nodes:   [NS, N1, N3, N4, N5, N6, N7, N8]
flavors: { N1: grill-with-docs, N3: openspec, N7: code-review+对抗审查 }
execution_modes: { NS: current-agent, N3: current-agent, N5: current-agent, N7: current-agent }
deps_check: { grill-with-docs: "missing→blocked", openspec: "missing→blocked", superpowers:writing-plans: ok, superpowers:test-driven-development: ok, superpowers:verification-before-completion: ok, superpowers:requesting-code-review: ok }
status: spec-locked
spec_commit: ""
created: 2026-06-16
---

# user-auth · Spec

## 项目意图与约束         <!-- NS-A Recon -->
- 已决策 ADR：
  - 技术栈：Next.js 15 + TypeScript + Prisma + PostgreSQL + BullMQ + Redis + Ant Design
  - 状态管理：SWR (useSWR) 用于前端数据获取
  - UI 组件：Ant Design v5，已有 AntdRegistry 包裹根布局
  - 当前 Teacher 认证方式：`prisma.teacher.findFirst()` 无参数查第一条——无鉴权
- 活跃演进方向（git log 近 5 条推断）：
  - 最近删除 mock 数据、接入真实 API
  - 新增教学资源/系统设置页面
  - 提取 ChatPanel 公共组件
  - 项目处于快速迭代阶段，UI 基本定型，后端接口陆续真实化
- 不可违背的约束：
  - `next-auth@4.24.10` 已安装（与 Next.js 15 需注意兼容性）
  - `@auth/prisma-adapter@2.4.1` 已安装
  - `Teacher` 模型已有 `email`、`password`、`id`、`name`、`subject`、`role` 字段
  - `password` 字段当前为明文存储（需确认是否已哈希，或在 spec 中决策）
  - 构建命令：`pnpm build` / 测试：`pnpm test` / lint：`pnpm lint`
- Recon 读取的意图文档：
  - `package.json`、`prisma/schema.prisma`、`src/app/layout.tsx`、`src/app/(dashboard)/layout.tsx`、`src/app/api/teacher/route.ts`、git log

## 涉及服务 / 跨仓范围        <!-- NS-B Scope -->
- 当前项目：单体 Next.js 全栈应用（前端 + 后端 API routes 同仓）
- 关联服务 / 仓（本功能改动面）：
  - Next.js API Routes（后端）：所有 `/src/app/api/**` 路由需加 session 鉴权
  - Next.js Pages（前端）：需新增 `/login` 页面，`layout.tsx` 需加 `SessionProvider`
  - Prisma / PostgreSQL：NextAuth 若用 DB session 需加表（决策点）；CredentialsProvider 可不加
  - BullMQ Worker（`src/lib/queue/worker-entry.ts`）：独立进程，不需要 HTTP 鉴权改动
- 关联 API / 配置 / DB / 回调链路：
  - `NEXTAUTH_SECRET`、`NEXTAUTH_URL` 环境变量需配置
  - `/api/teacher/route.ts`：需改为从 session 读 teacherId，不再 findFirst()
  - `src/app/(dashboard)/layout.tsx`：avatar/teacherName 需改为 session 数据来源
- 完整功能边界：纯前端+API 全栈单仓，无跨仓依赖

## 问题与非目标            <!-- N1 · grill-with-docs ✅ -->
- **要解决的痛点**：系统无任何身份认证，任何人可直接访问全部 dashboard 页面和 API
- **用户**：教师（Teacher），由管理员在数据库中手动创建账号
- **非目标（明确不做）**：
  - 注册页面（无自助注册，管理员手动建账）
  - 邮箱验证、OAuth、多端登录、密码找回
  - 密码修改 UI（系统设置页暂留空）
- **失败路径**：
  - 未登录访问 `/(dashboard)/**` → middleware 重定向到 `/login`
  - 登录失败（邮箱不存在或密码错误）→ 显示通用错误"邮箱或密码错误"（不区分两种情况，防枚举）
  - Session 过期 → 自动重定向到 `/login`
- **关键决策（N1 确认）**：
  - 密码存储：现有记录为**明文**（开发测试数据），启用 auth 前需执行 bcrypt 哈希迁移脚本
  - NEXTAUTH_URL：`http://localhost:3001`（dev 端口 3001，生产地址另配）
  - Session 策略：JWT（CredentialsProvider 默认，无需 DB session 表）
  - 见 ADR-001: docs/adr/ADR-001-jwt-session.md

## 领域词表                <!-- N2：未选，N/A -->
N/A

## 需求                    <!-- N3 · openspec ✅ -->

**功能需求 FR-001**: 教师通过 email + bcrypt password 登录，获取 JWT session  
**功能需求 FR-002**: 未登录访问 `/(dashboard)/**` → middleware 重定向到 `/login`  
**功能需求 FR-003**: 未登录调用受保护 API route → HTTP 401  
**功能需求 FR-004**: 教师可退出登录，session cookie 清除，重定向 `/login`  
**功能需求 FR-005**: 已登录用户访问 `/login` → 重定向到 `/`  
**功能需求 FR-006**: API routes 从 session 获取 teacherId，不再 findFirst()  
**功能需求 FR-007**: 现有明文密码通过迁移脚本一次性 bcrypt hash 化（幂等）  

**非功能需求 NFR-001**: bcryptjs cost=10，登录耗时 <500ms（单次操作）  
**非功能需求 NFR-002**: 登录失败显示通用错误，不区分"邮箱不存在"与"密码错误"（防枚举）  
**非功能需求 NFR-003**: 无注册功能，Teacher 账号由管理员在 DB 中手动创建  
**非功能需求 NFR-004**: JWT session 策略，无需 NextAuth DB 表，Prisma schema 不变  

详细规格：`openspec/changes/add-user-auth/specs/teacher-auth/spec.md`

## 数据模型 / API / UI / 兼容 / 权限   <!-- N3 · openspec ✅ -->

**新增 API**:
- `POST /api/auth/callback/credentials` — NextAuth CredentialsProvider 内部 handler
- `GET/POST /api/auth/[...nextauth]` — NextAuth 标准 catch-all route

**修改 API**:
- `GET /api/teacher` — 从 session 读 teacherId，替换 findFirst()
- 其余 9 个 API routes — 加 `getServerSession()` 鉴权守卫

**新增 Pages**:
- `/login` — 独立登录页（不在 `(dashboard)` layout group 内）

**新增文件**:
- `src/lib/auth.ts` — authOptions（CredentialsProvider + session callback）
- `src/middleware.ts` — matcher: `/(dashboard)/(.*)`
- `scripts/migrate-passwords.ts` — 明文→bcrypt 迁移

**权限设计**:
- 公开路由：`/login`、`/api/auth/**`、`/_next/**`
- 受保护路由：其余所有

**兼容性**:
- next-auth v4 + Next.js 15 App Router：使用 `getServerSession()` 不使用废弃的 `getSession()`
- SessionProvider 在 root layout（client component wrapper）

## 验收标准                <!-- N3 · openspec ✅ -->

- AC-001: 正确凭据登录 → session 建立 → 重定向到 `/`
- AC-002: 错误密码登录 → 显示"邮箱或密码错误" → 停留 `/login`
- AC-003: 未登录访问 `/` → 重定向到 `/login`
- AC-004: 未登录 `GET /api/teacher` → 返回 `{"error":"未登录"}` HTTP 401
- AC-005: 退出登录 → cookie 清除 → 重定向到 `/login` → 再访问 `/` 再次重定向
- AC-006: 已登录访问 `/login` → 重定向到 `/`
- AC-007: 迁移脚本重复运行 → 已哈希记录跳过 → 无报错

## 测试策略                <!-- N3 · openspec ✅ -->

- **手动验收**：AC-001 ～ AC-007 全部手动验证（见 N8 验证记录）
- **构建验证**：`pnpm lint` + `pnpm build`（TypeScript 类型检查）
- **E2E（可选扩展）**：playwright 可补充 login flow 测试
- 详细任务清单：`openspec/changes/add-user-auth/tasks.md`

## 任务拆解                <!-- N4 -->
N/A（pending N4 执行）

## 实现与测试记录          <!-- N5 -->
N/A

## 验证记录（DoD）         <!-- N6 -->
- [ ] 所有测试通过  [ ] lint  [ ] typecheck  [ ] build
- [ ] 新增逻辑有测试  [ ] 修改行为有回归  [ ] 无无关 diff  [ ] 无绕过测试

## 需求追溯矩阵            <!-- 风险H强制 -->
| Requirement | Spec | Task | Test | Status |
|---|---|---|---|---|

## 审查记录                <!-- N7 -->
N/A

## 决策与归档（ADR）       <!-- N8 -->
N/A
