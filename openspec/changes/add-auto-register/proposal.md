## Why

教师无法自助创建账号——原设计要求管理员手动建账号，但管理员没有产品级入口，导致新用户无法加入系统。现在通过"首次登录即注册"的方式解决这个问题。

## What Changes

- **BREAKING**: `Teacher.email` 由 `String @unique`（必填）改为 `String? @unique`（可选），支持纯手机号账号
- `Teacher.phone` 新增 `@unique` 约束，防止同一手机号重复注册
- 登录逻辑扩展：若邮箱/手机号不存在，自动创建 Teacher 记录（silent auto-register）
- 登录页输入框由"邮箱"改为"邮箱或手机号"，移除 email 格式强校验
- 单元测试新增手机号路径和自动注册路径覆盖

## Capabilities

### New Capabilities
- `auto-register`: 用户首次使用邮箱或手机号登录时自动创建账号，name 默认为邮箱前缀/手机号，subject 默认"未设置"

### Modified Capabilities
- `credentials-login`: 从仅支持邮箱登录，扩展为支持邮箱或手机号（11位纯数字）双标识符登录

## Impact

- `prisma/schema.prisma` — Teacher 模型字段约束变更，需生成并运行 migration
- `src/lib/auth.ts` — authorize() 重写，支持双标识符查找 + 账号不存在时 upsert
- `src/app/login/page.tsx` — 表单输入框和校验规则更新
- `src/types/next-auth.d.ts` — 可能新增 phone 字段（按需）
- `tests/unit/auth-authorize.test.ts` — 新增测试用例
- 无新增 npm 依赖
