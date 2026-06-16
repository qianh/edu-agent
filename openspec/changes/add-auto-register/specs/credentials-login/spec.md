## MODIFIED Requirements

### Requirement: Login accepts email or phone number
The system SHALL accept either a valid email address or an 11-digit Chinese phone number as the login identifier. The input field MUST be labeled "邮箱或手机号".

Identifier detection:
- Input contains `@` → treat as email; look up by `Teacher.email`
- Input is exactly 11 digits → treat as phone; look up by `Teacher.phone`
- Otherwise → reject with "请输入有效的邮箱或11位手机号"

#### Scenario: Email login accepted
- **WHEN** user enters `user@example.com` in the identifier field
- **THEN** system queries `Teacher` by `email = "user@example.com"`

#### Scenario: Phone login accepted
- **WHEN** user enters `13800138000` (11 digits) in the identifier field
- **THEN** system queries `Teacher` by `phone = "13800138000"`

#### Scenario: Invalid format rejected client-side
- **WHEN** user enters `abc123` (neither email nor 11-digit number)
- **THEN** form validation fails before submission with message "请输入有效的邮箱或11位手机号"

#### Scenario: Wrong password on existing account
- **WHEN** user enters correct email/phone but wrong password
- **THEN** system returns "账号或密码错误" (not "邮箱或密码错误")

### Requirement: Prisma schema supports dual nullable unique identifiers
The Teacher model SHALL have both `email` and `phone` as optional unique fields so that an account can be identified by either.

#### Scenario: Email-only account persists without phone
- **WHEN** a Teacher record is created with email and no phone
- **THEN** `phone` field is NULL and no unique constraint violation occurs

#### Scenario: Phone-only account persists without email
- **WHEN** a Teacher record is created with phone and no email
- **THEN** `email` field is NULL and no unique constraint violation occurs

#### Scenario: Duplicate phone rejected at DB level
- **WHEN** inserting a Teacher with a phone number that already exists
- **THEN** database raises a unique constraint violation
