## 1. 依赖安装与环境配置

- [ ] 1.1 安装 `bcryptjs`：`pnpm add bcryptjs`（bcryptjs 3.x 自带类型定义，无需 `@types/bcryptjs`）
- [ ] 1.2 更新 `.env.local`：将 `NEXTAUTH_URL` 改为 `http://localhost:3001`，设置真实 `NEXTAUTH_SECRET`

## 2. NextAuth 核心配置

- [ ] 2.1 创建 `src/lib/auth.ts`：配置 CredentialsProvider，用 `bcryptjs.compare()` 验证密码，session 载体含 `{ id, email, name, subject, role }`
- [ ] 2.2 创建 `src/app/api/auth/[...nextauth]/route.ts`：导出 GET/POST handler，使用 `src/lib/auth.ts` 的 authOptions
- [ ] 2.3 创建 `src/middleware.ts`：保护 `/(dashboard)/**` 路由（未登录 → redirect /login），放行 `/login` 和 `/api/auth/**`

## 3. 登录页面

- [ ] 3.1 创建 `src/app/login/page.tsx`：Ant Design Form（邮箱 + 密码）、提交调用 `signIn('credentials')`、错误提示显示"邮箱或密码错误"
- [ ] 3.2 确保 `/login` 无 dashboard layout 包裹（独立路由，不在 `(dashboard)` 分组内）
- [ ] 3.3 已登录用户访问 `/login` 时重定向到 `/`

## 4. Session Provider 注入

- [ ] 4.1 修改 `src/app/layout.tsx`：注入 `SessionProvider`（next-auth/react），包裹 `{children}`

## 5. Dashboard Layout 适配

- [ ] 5.1 修改 `src/app/(dashboard)/layout.tsx`：用 `useSession()` 替换 `useSWR('/api/teacher', fetcher)` 获取教师姓名和 avatar 字符
- [ ] 5.2 在 layout 中增加退出登录入口（点击 Avatar 下拉菜单，调用 `signOut()`）

## 6. API Routes 鉴权

- [ ] 6.1 修改 `src/app/api/teacher/route.ts`：从 session 读 teacherId，替换 `findFirst()`；未登录返回 401
- [ ] 6.2 修改 `src/app/api/assignments/route.ts`：加 session 鉴权守卫，未登录返回 401
- [ ] 6.3 修改 `src/app/api/assignments/upload/route.ts`：加 session 鉴权守卫
- [ ] 6.4 修改 `src/app/api/classes/route.ts`：加 session 鉴权守卫
- [ ] 6.5 修改 `src/app/api/students/route.ts`：加 session 鉴权守卫
- [ ] 6.6 修改 `src/app/api/knowledge/points/route.ts`：加 session 鉴权守卫
- [ ] 6.7 修改 `src/app/api/questions/generate/route.ts`：加 session 鉴权守卫
- [ ] 6.8 修改 `src/app/api/stats/monthly/route.ts`：加 session 鉴权守卫
- [ ] 6.9 修改 `src/app/api/class-dashboard/trend/route.ts`：加 session 鉴权守卫

## 7. 密码迁移脚本

- [ ] 7.1 创建 `scripts/migrate-passwords.ts`：读取所有 Teacher 记录，检测明文密码（非 `$2b$` 前缀），hash 后写回；幂等安全
- [ ] 7.2 运行迁移脚本并验证数据库中 password 字段已更新为 bcrypt hash

## 8. 验证

- [ ] 8.1 `pnpm lint` 通过，`pnpm build` 无 TypeScript 错误
- [ ] 8.2 手动测试：未登录访问 `/` → 重定向到 `/login`
- [ ] 8.3 手动测试：用正确凭据登录 → 进入 dashboard，姓名正确显示
- [ ] 8.4 手动测试：用错误密码登录 → 显示"邮箱或密码错误"
- [ ] 8.5 手动测试：退出登录 → 重定向到 `/login`，再访问 dashboard 再次重定向
- [ ] 8.6 手动测试：已登录时 `/api/teacher` 返回当前教师信息，未登录返回 401
