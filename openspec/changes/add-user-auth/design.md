## Context

edu-agent 是一个 Next.js 15 全栈单体应用，面向中学教师。当前无身份认证，所有路由对任意访问者开放。`next-auth@4.24.10` 和 `@auth/prisma-adapter@2.4.1` 已安装但未配置。Teacher 模型已有 `email`/`password` 字段，password 当前为明文存储（开发测试数据）。系统仅面向内部教师使用，无自助注册需求。

## Goals / Non-Goals

**Goals**:
- 教师通过 email + password 登录，获取 JWT session
- 未登录访问 `/(dashboard)/**` 重定向到 `/login`
- 所有 API routes 返回 401（未登录时）
- 密码安全：bcryptjs 哈希存储和验证
- 迁移现有明文密码记录

**Non-Goals**:
- 自助注册（管理员手动建账）
- OAuth / SSO
- DB session（JWT 已足够）
- 邮箱验证、密码找回
- 记住我 / 长期 session
- 密码修改 UI

## Decisions

### D1: CredentialsProvider + JWT session

**选择**: CredentialsProvider（email/password），JWT session 策略（next-auth v4 默认）。

**理由**: 
- 无需新增 NextAuth DB 表（Account/Session/User/VerificationToken），Prisma schema 不变
- 教师账号由管理员管控，无 OAuth 需求
- 内部工具，无法 server-side invalidate session 的限制可接受

**备选方案**: DB session — 需要 4 张额外 Prisma 表 + 每次请求 DB 查询。成本高于收益。

### D2: bcryptjs 代替 bcrypt

**选择**: `bcryptjs`（纯 JS 实现）

**理由**: `bcrypt` 是 native C++ addon，在 Next.js 15 App Router 中需要 `serverExternalPackages` 配置。`bcryptjs` 零依赖，App Router 兼容，性能差异在教师登录场景可忽略。

### D3: 密码迁移策略 — 单次迁移脚本

**选择**: 提供 `scripts/migrate-passwords.ts`，由开发者在启用 auth 前手动运行一次。

**理由**: 现有记录为开发测试数据，直接一次性迁移最简单。生产环境无真实用户，无需在线迁移。

### D4: Session 载体 — teacherId + 必要信息

**JWT 载体**: `{ id, email, name, subject, role }` — 避免每次请求都查 DB。

### D5: next-auth v4 与 Next.js 15 App Router 兼容性

**选择**: 使用 `getServerSession(authOptions)` 在 Server Components 和 Route Handlers 中获取 session（非 `getSession()`，后者在 App Router 中已废弃）。

## Risks / Trade-offs

- **JWT 无法 server-side 失效** → 如需踢人，只能等 token 过期（默认 30 天）。可接受，当前无多账号安全需求。
- **bcryptjs 性能** → cost=10，约 100ms/次。登录场景可接受。
- **next-auth v4 + Next.js 15** → next-auth v4 对 Next.js 15 App Router 有轻微 peer warning，但功能正常；next-auth v5 (Auth.js) API 破坏性较大暂不升级。

## Migration Plan

1. 安装 `bcryptjs` 依赖
2. 运行 `pnpm tsx scripts/migrate-passwords.ts` 迁移明文密码
3. 配置 `NEXTAUTH_SECRET` 和 `NEXTAUTH_URL=http://localhost:3001`
4. 启动开发服务器，验证登录流程
5. 回滚方案：git revert 所有 auth 相关提交，删除迁移后的 password 数据，重填明文测试密码

## Open Questions

（已在 N1 拷问中全部解决）
