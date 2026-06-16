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
