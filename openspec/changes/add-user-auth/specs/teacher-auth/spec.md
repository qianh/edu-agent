## ADDED Requirements

### Requirement: 教师可通过邮箱和密码登录

系统 SHALL 提供 `/login` 页面，教师输入 email 和 password 后完成身份验证，获得 JWT session。密码 SHALL 使用 bcryptjs 验证（cost=10）。

#### Scenario: 有效凭据登录成功
- **WHEN** 教师提交有效的 email + 正确的 bcrypt 密码
- **THEN** 系统创建 JWT session 并重定向到 `/`（dashboard 首页）

#### Scenario: 邮箱不存在时登录失败
- **WHEN** 教师提交一个数据库中不存在的 email
- **THEN** 系统返回通用错误提示"邮箱或密码错误"，不区分错误类型（防止枚举攻击）

#### Scenario: 密码错误时登录失败
- **WHEN** 教师提交存在的 email 但密码不匹配
- **THEN** 系统返回通用错误提示"邮箱或密码错误"

#### Scenario: 空字段时登录失败
- **WHEN** 教师提交空 email 或空 password
- **THEN** 客户端表单校验阻止提交，显示必填提示

---

### Requirement: 未登录访问受保护路由时重定向

系统 SHALL 通过 Next.js middleware 保护 `/(dashboard)/**` 下的所有路由和 `/api/**` 路由（公开路由除外：`/login`、`/api/auth/**`）。

#### Scenario: 未登录访问 dashboard 页面
- **WHEN** 未持有有效 session 的请求访问任意 `/(dashboard)/**` 路由
- **THEN** middleware 将请求重定向到 `/login`

#### Scenario: 未登录调用 API route
- **WHEN** 未持有有效 session 的请求调用任意 `/api/**` 受保护路由（非 `/api/auth/**`）
- **THEN** API 返回 HTTP 401 `{ error: "未登录" }`

#### Scenario: 已登录时访问 /login
- **WHEN** 持有有效 session 的用户访问 `/login`
- **THEN** 重定向到 `/`（已登录无需再次登录）

---

### Requirement: 教师可退出登录

系统 SHALL 在 dashboard 中提供退出登录入口。退出后 JWT cookie 被清除，重定向到 `/login`。

#### Scenario: 退出登录
- **WHEN** 教师点击退出登录
- **THEN** next-auth `signOut()` 清除 session cookie，并重定向到 `/login`

---

### Requirement: API Routes 从 session 获取 teacherId

所有受保护的 API routes SHALL 通过 `getServerSession(authOptions)` 获取当前登录教师的 `id`，不得使用 `prisma.teacher.findFirst()` 无条件查询。

#### Scenario: 已登录教师调用 /api/teacher
- **WHEN** 持有有效 session 的请求调用 `GET /api/teacher`
- **THEN** 返回当前 session 中教师的信息（id, name, email, subject）

#### Scenario: 已登录教师调用其他 API
- **WHEN** 持有有效 session 的请求调用任意受保护 API（如 `/api/assignments`）
- **THEN** 路由内部使用 session.user.id 作为 teacherId 过滤数据

---

### Requirement: 密码以 bcrypt 哈希形式存储

系统 SHALL 在启用认证前将所有现有明文密码迁移为 bcryptjs 哈希（cost=10）。新创建 Teacher 记录时 password SHALL 为哈希值。

#### Scenario: 迁移脚本运行成功
- **WHEN** 执行 `pnpm tsx scripts/migrate-passwords.ts`
- **THEN** 数据库中所有 Teacher 记录的 password 字段被替换为 bcrypt hash，原明文不再保留

#### Scenario: 重复运行迁移脚本安全
- **WHEN** 迁移脚本在已哈希的数据上重复运行
- **THEN** 脚本检测到已是 bcrypt 格式（`$2b$` 前缀），跳过该记录不做改动
