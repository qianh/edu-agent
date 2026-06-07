---
task: install pgvector PG15 and run prisma migration
slug: 20260524-000000_pgvector-install-and-migrate
effort: standard
phase: complete
progress: 10/10
mode: interactive
started: 2026-05-24T00:00:00Z
updated: 2026-05-24T00:00:00Z
---

## Context

Building pgvector from source for PostgreSQL 15 (Homebrew bottle only supports PG17/18).
Then enabling the extension in both databases and running the initial Prisma migration to
create all 12 tables for the edu-agent MVP.

### Risks
- Source build may fail if XCode/Command Line Tools path mismatched
- pg_config path must point to PG15, not any other version
- Prisma migration may fail if schema has unsupported PG15 syntax

## Criteria

- [x] ISC-1: pgvector built from source without compilation errors
- [x] ISC-2: pgvector installed to PG15 extension directory
- [x] ISC-3: `CREATE EXTENSION vector` succeeds in edu_agent database
- [x] ISC-4: `CREATE EXTENSION vector` succeeds in edu_agent_test database
- [x] ISC-5: `pnpm prisma migrate dev --name init` completes without error
- [x] ISC-6: All 12 schema models exist as tables in edu_agent
- [x] ISC-7: Migration SQL file created in prisma/migrations/
- [x] ISC-8: `prisma/schema.prisma` vector columns compile correctly
- [x] ISC-9: No existing PG15 installation damaged or disrupted
- [x] ISC-10: Both databases accessible via postgres role after migration

## Decisions

## Verification
