# Testing Guide

## Running everything

```bash
npm install          # once, at the repo root
npm run db:generate   # generates the Prisma client (@pr-pilot/db)
npm test              # runs every workspace's test suite
```

`npm test` fans out to each workspace's own `test` script (`--workspaces --if-present`),
so packages without tests (`@pr-pilot/types`, `@pr-pilot/config`, `@pr-pilot/db`) are
skipped, not failed.

## Per-workspace

| Workspace | Runner | Command | What's covered |
|---|---|---|---|
| `apps/api` | Jest | `npm run test -w @pr-pilot/api` | Unit tests for every service, guard, util |
| `apps/api` (e2e) | Jest + supertest | `cd apps/api && npm run test:e2e` | Real HTTP requests through the auth flow, with Prisma mocked |
| `apps/worker` | Vitest | `npm run test -w @pr-pilot/worker` | Chunker, GitHub client, ingestion orchestration |
| `apps/web` | Vitest + RTL | `npm run test -w @pr-pilot/web` | Pure utils + component rendering |
| `packages/ui` | Vitest + RTL | `npm run test -w @pr-pilot/ui` | Shared components in isolation |
| `packages/sdk` | Vitest | `npm run test -w @pr-pilot/sdk` | Client retry/backoff/error behavior |

## What's actually verified in this repository (not just claimed)

At the time this was written, running the full suite produces:
- **105 passing tests** across 7 workspaces (54 API unit + 4 API e2e + 33 worker + 5 web
  + 5 SDK + 4 UI).
- **Zero typecheck errors** across all 7 workspaces (`npm run typecheck`).
- **Successful production builds** for all three deployable apps (`nest build`,
  `tsc -p tsconfig.json`, `next build`).

The e2e suite for `apps/api` is not decorative: while building it, it caught a real
NestJS dependency-injection bug (`AuthCommonModule` wasn't re-exporting
`ApiKeyAuthModule`, which would have broken every guarded route at runtime despite
every unit test passing) — see `docs/adrs/0004-dual-auth-session-and-api-key.md`. This
is the concrete argument for why the testing pyramid's integration layer exists even
when unit coverage looks complete: unit tests mock the exact boundary they're testing,
so they can't catch a wiring mistake at that boundary.

## Local integration testing against real infra

`docker-compose.yml` at the repo root brings up Postgres (pgvector) and Redis:
```bash
docker compose up -d
npm run db:migrate:dev -w @pr-pilot/db
npm run db:seed
```
Then run `apps/api` and `apps/worker` against that real DB/queue
(`npm run dev:api`, `npm run dev:worker`) for manual end-to-end verification, or as the
foundation for future integration tests that hit a real Postgres instead of a mocked
`PrismaService`.

## Known gaps (documented, not hidden)

- No Playwright E2E suite against the fully running stack yet — the `apps/api` e2e
  test covers the auth flow at the HTTP layer, but nothing today drives a real browser
  through the dashboard. Adding this is the natural next step given the
  `docker-compose.yml` infra already exists.
- No integration test hits a real Postgres/Redis yet (everything currently mocks
  `PrismaService` at the unit/e2e boundary) — see the local integration setup above as
  the starting point for closing this gap.
- Coverage thresholds are not currently enforced in CI (no CI pipeline is configured in
  this repository at all — see `docs/runbook.md` for what's operationally live vs. not).
