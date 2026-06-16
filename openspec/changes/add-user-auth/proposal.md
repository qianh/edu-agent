## Why

系统当前无任何身份认证，所有 dashboard 页面和 API 路由对任何访问者完全开放。教师的学生数据、成绩、AI 批改结果等敏感信息面临未授权访问风险。

## What Changes

- 新增 `/login` 页面（邮箱 + 密码表单，Ant Design 样式）
- 新增 NextAuth v4 CredentialsProvider 配置（JWT session 策略）
- 新增 Next.js middleware 保护 `/(dashboard)/**` 所有路由
- 修改 `src/app/layout.tsx` 注入 SessionProvider
- 修改 `src/app/(dashboard)/layout.tsx` 从 session 获取教师信息（替换 `/api/teacher` findFirst）
- 修改全部 9 个 API routes 加 session 鉴权（未登录返回 401）
- 修改 `/api/teacher` 从 session 中读取 teacherId 而非 findFirst()
- 新增密码哈希迁移脚本（bcrypt，处理现有明文密码记录）
- 更新 `.env.local`：NEXTAUTH_URL 改为 `http://localhost:3001`

## Capabilities

### New Capabilities
- `teacher-auth`: 教师身份认证能力 — 登录/退出、session 管理、路由保护

### Modified Capabilities
（无现有 spec，所有功能均为新建）

## Impact

- **前端**：新增 `/login` page + `/app/layout.tsx` + dashboard layout 修改
- **后端**：新增 `/api/auth/[...nextauth]` route + `src/lib/auth.ts` + middleware
- **API Routes（9个）**：全部加 session 鉴权守卫
- **数据库**：不新增表（JWT session 无需 NextAuth DB 表）；需运行一次明文→bcrypt 迁移脚本
- **依赖**：新增 `bcryptjs`（纯 JS，无需编译）；next-auth 已安装
