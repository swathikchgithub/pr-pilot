# Code Walkthrough (for a new engineer)

Read `docs/architecture.md` first for the big picture. This doc is a guided tour of the
actual code, folder by folder, with pointers to where to start reading.

## Folder-by-folder

```
pr-pilot/
├── apps/
│   ├── web/       Next.js dashboard — presentation only, no business logic
│   ├── api/       NestJS API — all business logic, auth, data access
│   └── worker/    Node/BullMQ service — repo ingestion pipeline
├── packages/
│   ├── types/     Shared TS interfaces (DTOs) used by web, api, sdk
│   ├── db/        Prisma schema + migrations + generated client (single source of truth)
│   ├── ui/        Shared React components (Button, Card, Table, Badge, EmptyState...)
│   ├── sdk/       @pr-pilot/sdk — the client agents/CI actually install
│   └── config/    Shared tsconfig/eslint/tailwind presets
├── infra/docker/  Dockerfiles for api and worker (Railway build targets)
├── scripts/       seed.ts — local demo data
├── docs/          You are here
└── docker-compose.yml   Local Postgres (pgvector) + Redis for dev
```

## Start here if you're touching...

### ...the query or impact-analysis pipeline
`apps/api/src/query/query.service.ts` and `apps/api/src/impact/impact.service.ts` are
the orchestrators — short, linear, and read top-to-bottom like a recipe: get the ready
repo, embed the question/diff, hybrid-search, rerank, generate, record an audit entry.
Each step is a separate injected service under `apps/api/src/retrieval/` — read those
next, each is single-purpose and independently tested.

### ...auth
`apps/api/src/common/guards/org-auth.guard.ts` is the one guard every protected route
uses. Read it alongside `docs/adrs/0004-dual-auth-session-and-api-key.md` — it explains
*why* the guard is shaped the way it is, including a real DI gotcha we hit and fixed.

### ...ingestion / chunking
Start at `apps/worker/src/ingest/ingest-repo.ts` (the orchestrator), then
`apps/worker/src/chunking/structural-chunker.ts` (the actual chunking algorithm — read
`docs/adrs/0007-heuristic-chunker-v1.md` first for *why* it's a heuristic, not a real
parser, and what its known limitations are).

### ...the database schema
`packages/db/prisma/schema.prisma` is the only place the schema is defined. Never add a
model or column directly in `apps/api` or `apps/worker`. See `docs/erd.md`.

### ...the dashboard
Every `apps/web/app/dashboard/*/page.tsx` follows the same shape: a `"use client"`
component that fetches from the API on mount via `lib/api-client.ts`'s `apiFetch()`,
shows a loading/empty/error state, and renders a `@pr-pilot/ui` `Table`/`Card`. There is
no server-side data fetching in this app — see ADR-adjacent reasoning in
`docs/tdd.md` §7 for why (avoids fragile cross-service SSR cookie forwarding for an
admin dashboard that isn't SEO-sensitive).

### ...the SDK
`packages/sdk/src/client.ts` is the whole public surface (`PrPilotClient`). Retry logic
lives in `http.ts`, kept separate so it's independently testable
(`client.test.ts` exercises retry/backoff behavior without hitting a real network).

## How a request actually flows, end to end

For `POST /v1/query`, in call order:
1. `main.ts` — global `ValidationPipe`, CORS, cookie parser already wired up.
2. `common/guards/org-auth.guard.ts` — resolves the caller's `OrgContext`.
3. `query/query.controller.ts` — validates the body against `QueryDto`, calls the
   service.
4. `query/query.service.ts` — the orchestration described above.
5. `common/filters/http-exception.filter.ts` — catches anything thrown anywhere above
   and normalizes the response shape (this runs for every request, not just errors).

## Conventions worth knowing before you write more code

- **Controllers are thin.** If you're writing an `if` in a controller method beyond
  extracting `@CurrentOrgContext()`/`@Body()`, that logic belongs in the service.
- **Every DTO uses `class-validator`.** The global pipe rejects unknown fields
  (`forbidNonWhitelisted: true`) — don't bypass this by typing a controller parameter
  as a plain interface.
- **Raw SQL is isolated.** The only two files that touch `$queryRaw`/`$executeRaw` are
  `retrieval/hybrid-search.service.ts` and `worker/ingest/persist-chunks.ts` — both
  exist solely because Prisma can't read/write `vector` columns natively. Don't add raw
  SQL elsewhere without a similarly hard constraint forcing it.
- **Tests live next to the code** (`*.spec.ts` for Jest in `apps/api`, `*.test.ts` for
  Vitest everywhere else), not in a parallel `__tests__` tree — see any existing
  service for the pattern.
- **New feature module checklist**: controller (thin) + service (logic) + DTO(s) +
  `.spec.ts` for the service + import `AuthCommonModule` if it needs
  `OrgAuthGuard`/`RolesGuard`.
