## ADDED Requirements

### Requirement: Silent auto-register on first login
If a user submits an email or phone number that does not exist in the database, the system SHALL automatically create a new Teacher account and establish a session — without any separate registration step or user confirmation.

Auto-created account defaults:
- `name`: email prefix (part before `@`) if email login; phone number string if phone login
- `subject`: `"未设置"`
- `role`: `"teacher"`
- `password`: bcryptjs hash of the submitted password (cost=10)

#### Scenario: New email auto-registers successfully
- **WHEN** user submits `email=new@example.com` and `password=anypassword` and no Teacher with that email exists
- **THEN** system creates a Teacher record with `email=new@example.com`, `name="new"`, `subject="未设置"`, `role="teacher"`, `password=hashed`
- **THEN** system establishes a JWT session and redirects to `/`

#### Scenario: New phone number auto-registers successfully
- **WHEN** user submits `emailOrPhone=13800138001` (11 digits) and `password=anypassword` and no Teacher with that phone exists
- **THEN** system creates a Teacher record with `phone="13800138001"`, `name="13800138001"`, `subject="未设置"`, `role="teacher"`, `password=hashed`
- **THEN** system establishes a JWT session and redirects to `/`

#### Scenario: Duplicate email does not create second account
- **WHEN** user submits `email=existing@example.com` which already exists in the database
- **THEN** system does NOT create a new Teacher record
- **THEN** system validates the submitted password against the stored hash

#### Scenario: Duplicate phone does not create second account
- **WHEN** user submits `emailOrPhone=13800138001` which already has an account
- **THEN** system does NOT create a new Teacher record
- **THEN** system validates the submitted password against the stored hash

### Requirement: Default profile is completable in Settings
After auto-registration, the user's profile SHALL be editable in the Settings page so they can replace the default `name` and `subject` values.

#### Scenario: Auto-registered user sees default profile
- **WHEN** auto-registered user navigates to Settings
- **THEN** Settings page displays `name` (email prefix or phone) and `subject="未设置"`
- **THEN** user can edit and save these fields
