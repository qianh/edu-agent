# ADR-002: Silent Auto-Register on First Login

**Status**: Accepted  
**Date**: 2026-06-16

## Context

The system originally required an admin to manually create Teacher accounts. This was identified as a product gap: non-technical admins have no UI to create accounts, making onboarding impossible without developer intervention.

## Decision

Remove the "admin creates accounts" model. Instead, **any user who submits a valid email/phone + password combination for the first time is automatically registered** (silent auto-register). There is no separate registration page or confirmation step — the login form doubles as registration.

Security trade-off accepted: the system is an internal teacher tool with a small, known user base. Open registration is acceptable for the current stage. Verification codes (planned next iteration) will serve as the future access control gate.

## Consequences

- Any person with network access to the system can create an account
- Teacher accounts start with placeholder `name` (email prefix or phone number) and `subject = "未设置"` — users must complete their profile in Settings
- Password chosen at first login becomes the account password; no email verification
- Schema change required: `Teacher.email` becomes `String? @unique` (nullable), `Teacher.phone` gets `@unique` constraint
- CONTEXT.md definition of "Teacher" updated to reflect self-registration model

## Alternatives Considered

**Admin UI for account creation**: Requires building an admin role, protected admin routes, and account management pages. Over-engineered for current team size.

**Invite-code gate**: Better security, but adds friction before any verification infrastructure is in place. Defer to the verification-code iteration.
