## 1. Schema 迁移

- [ ] 1.1 修改 `prisma/schema.prisma`：`email String @unique` → `email String? @unique`
- [ ] 1.2 修改 `prisma/schema.prisma`：`phone String?` → `phone String? @unique`
- [ ] 1.3 运行 `pnpm prisma migrate dev --name add-auto-register`，生成迁移文件
- [ ] 1.4 验证迁移后现有账号（test@school.com）仍可查询

## 2. 认证逻辑重写（TDD）

- [ ] 2.1 在 `tests/unit/auth-authorize.test.ts` 新增 RED 测试：手机号登录已有账号（期望成功）
- [ ] 2.2 新增 RED 测试：邮箱首次登录自动注册（期望返回新建 teacher）
- [ ] 2.3 新增 RED 测试：手机号首次登录自动注册（期望返回新建 teacher）
- [ ] 2.4 新增 RED 测试：无效格式（如 "abc"）→ 期望 authorize 返回 null
- [ ] 2.5 修改 `src/lib/auth.ts` authorize()：
      - 输入字段从 `email` 改为 `emailOrPhone`
      - 识别逻辑：含 `@` → email 查找；11 位数字 → phone 查找；否则返回 null
      - 查找成功 → bcryptjs.compare，失败 → 返回 null
      - 查找失败 → prisma.teacher.create(默认值)，返回新建 teacher
- [ ] 2.6 修改 CredentialsProvider credentials 配置：`email` 字段改为 `emailOrPhone`
- [ ] 2.7 运行所有单元测试，验证 GREEN

## 3. 登录页更新

- [ ] 3.1 修改 `src/app/login/page.tsx`：
      - Form.Item name 从 `email` 改为 `emailOrPhone`
      - 移除 `type: 'email'` 校验规则
      - 新增自定义校验：含 @ → 邮箱格式，否则 → 必须 11 位纯数字
      - placeholder 改为"邮箱或手机号"
      - 错误提示改为"账号或密码错误"
- [ ] 3.2 修改 signIn 调用：`email: values.emailOrPhone` → `emailOrPhone: values.emailOrPhone`

## 4. 类型定义更新

- [ ] 4.1 检查 `src/types/next-auth.d.ts`：是否需要将 `phone` 加入 Session/User/JWT 类型（按需，当前可不加）
- [ ] 4.2 验证 TypeScript 类型检查通过：`pnpm tsc --noEmit`

## 5. 构建与测试验证

- [ ] 5.1 运行 `pnpm test --exclude "tests/e2e/**"`，所有测试通过（含新增的 auto-register 用例）
- [ ] 5.2 运行 `pnpm build`，编译成功无错误
- [ ] 5.3 启动 dev server，手动验证：
      - AC-001：新邮箱首次登录 → 自动注册 + 跳转 /
      - AC-002：新手机号首次登录 → 自动注册 + 跳转 /
      - AC-003：已有邮箱 + 正确密码 → 正常登录
      - AC-004：已有邮箱 + 错误密码 → "账号或密码错误"
      - AC-006：无效格式（abc123）→ 前端拦截
