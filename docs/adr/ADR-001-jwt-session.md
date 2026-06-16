# ADR-001: JWT Session over DB Session

**Status**: Accepted  
**Date**: 2026-06-16

## Context

next-auth v4 supports two session strategies: JWT (stateless, stored in cookie) and Database (session rows in DB via adapter). We need to choose one when wiring up CredentialsProvider.

## Decision

Use **JWT session strategy** (the next-auth v4 default for CredentialsProvider).

## Consequences

- No need to add NextAuth DB tables (Account, Session, User, VerificationToken) to Prisma schema
- Session payload stores teacherId, email, name, subject, role — readable server-side via `getServerSession()` or `getToken()`
- Cannot invalidate individual sessions server-side (user must wait for JWT expiry or clear cookie)
- Simpler setup, fewer moving parts — appropriate for current single-instance deployment

## Alternatives Considered

**DB session**: Would allow server-side invalidation but requires 4 extra Prisma tables and adds a DB round-trip on every authenticated request. Unnecessary for current scope (single teacher, internal tool).
