# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PR-Pilot is the context and impact-analysis layer for AI coding agents: grounded, cited
retrieval over a codebase plus pre-merge blast-radius analysis on a diff, with a full
audit trail. The dashboard (`apps/web`) is a secondary, human-facing surface — the API
and `@pr-pilot/sdk` are the product's primary interface.

Full context: `docs/prd.md`, `docs/go-to-market.md`. Architecture diagrams and
request/ingestion sequence flows: `docs/architecture.md`. Algorithms, complexity, module
boundaries: `docs/tdd.md`. Design decisions and trade-offs: `docs/adrs/`.

## Commands

npm workspaces monorepo (Node ≥20, npm ≥10). Root scripts run across all workspaces;
prefix with `-w @pr-pilot/<name>` to target one.

```bash
npm install
docker compose up -d              # local Postgres (pgvector) + Redis only — run apps on the host

npm run db:generate                # generate Prisma client (packages/db)
npm run db:migrate:dev             # run/create a dev migration
npm run db:seed                    # seed a demo org/repo/API key (scripts/seed.ts)

npm run dev:api                    # NestJS API on :4000 (nest start --watch)
npm run dev:worker                 # BullMQ ingestion worker (tsx watch)
npm run dev:web                    # Next.js dashboard on :3000

npm run build                      # build:shared (types, db) then every workspace
npm run lint                       # per-workspace, --if-present
npm run typecheck                  # per-workspace, --if-present
npm test                           # per-workspace, --if-present
cd apps/api && npm run test:e2e    # HTTP-level auth flow integration test (separate jest-e2e config)
```

Single test:
- `apps/api` uses Jest (`*.spec.ts`): `cd apps/api && npx jest path/to/file.spec.ts`
- Everywhere else (`apps/worker`, `apps/web`, `packages/sdk`, `packages/ui`) uses Vitest
  (`*.test.ts`, colocated with the code): `npm run test -w @pr-pilot/worker -- path/to/file.test.ts`

Env: copy `.env.example` to `apps/api/.env`, `apps/worker/.env`, and
`apps/web/.env.local` (see file header for which vars each app needs). Never commit a
populated `.env*`.

## Architecture

Three deployable services sharing one Postgres (pgvector) DB and one Redis job queue:

- `apps/web` — Next.js 14 App Router dashboard. Presentation only, no business logic.
  Every page is a `"use client"` component that fetches via `lib/api-client.ts`'s
  `apiFetch()` on mount and renders `@pr-pilot/ui` components — no server-side data
  fetching (avoids cross-service SSR cookie forwarding for a non-SEO admin dashboard).
- `apps/api` — NestJS. All business logic, auth, data access, rate limiting. Deploys to
  Railway.
- `apps/worker` — Node + BullMQ. Repo ingestion: fetch from GitHub, chunk, embed,
  persist. Deploys to Railway.

Shared packages: `@pr-pilot/types` (DTOs used by web/api/sdk), `@pr-pilot/db` (Prisma
schema — the *only* place the schema is defined; never add a model/column in `apps/api`
or `apps/worker`), `@pr-pilot/ui` (React components), `@pr-pilot/sdk` (the client agents
and CI actually install — `packages/sdk/src/client.ts` is the whole public surface;
retry/backoff logic is isolated in `http.ts`), `@pr-pilot/config` (shared
tsconfig/eslint/tailwind).

External services: Google Gemini for embeddings + generation, Cohere for reranking,
GitHub REST API for repo content.

### Layering within `apps/api`

```
Controller  (HTTP boundary: DTO validation, guards — no business logic)
   -> Service  (orchestration, business rules)
      -> Retrieval services (embedding, hybrid search, rerank, generation)
      -> PrismaService (data access)
```

- `OrgAuthGuard`/`RolesGuard` run before the controller and attach a verified
  `OrgContext`; every downstream layer trusts `orgId` came from this, never from a
  request body. There is no endpoint that accepts an org ID from the request for
  authorization purposes.
- `query.service.ts` and `impact.service.ts` are the orchestrators — read top-to-bottom
  like a recipe: get the ready repo, embed the question/diff, hybrid-search, rerank,
  generate, record an audit entry. Each step is a separate, independently-tested,
  single-responsibility service under `apps/api/src/retrieval/`.
- `common/filters/http-exception.filter.ts` catches everything thrown above it and
  normalizes the response shape, for every request.

### Data flow ownership (single source of truth)

- Chunk embeddings: written only by the worker, read only by the API.
- Repo status (`PENDING → INDEXING → READY/FAILED`): written only by the worker, except
  the initial `PENDING` row the API creates on registration.
- Audit log: written only by `AuditService`, called from `QueryService`/`ImpactService`
  — never written directly by a controller.

### Raw SQL is isolated

Only `apps/api/src/retrieval/hybrid-search.service.ts` and
`apps/worker/src/ingest/persist-chunks.ts` use `$queryRaw`/`$executeRaw`, both solely
because Prisma can't read/write the `vector` column type natively. Don't add raw SQL
elsewhere without an equally hard constraint.

### Ingestion pipeline

`apps/worker/src/ingest/ingest-repo.ts` is the orchestrator:
fetch GitHub tree recursively -> fetch blob content per ingestible file ->
`structural-chunker.ts` chunks each file (a heuristic chunker, not a real parser — see
`docs/adrs/0007-heuristic-chunker-v1.md` for known limitations) -> batch-embed all
chunks via Gemini -> delete old chunks + insert new ones in a transaction -> mark repo
`READY` with `chunkCount`/`lastIndexedAt`. BullMQ concurrency is per-process
(`CONCURRENCY = 2`); scale via more worker replicas, not higher concurrency — GitHub and
embedding API rate limits are the real ceiling.

### Security boundaries

- Every data-access query in `apps/api` is scoped by the verified `orgId`.
- Retrieved code content and diffs are treated as untrusted data in LLM prompts: system
  prompts explicitly instruct the model to treat `<context>`/`<candidates>` blocks as
  data, not instructions (`generation.service.ts`, `impact-generation.service.ts`) — a
  prompt-injection mitigation.
- Model-reported impact-analysis chunks are cross-checked against the actual retrieved
  candidate set before being returned; anything the model invented is dropped.
- Full auth model and known gaps: `docs/security.md`.

## Conventions

- Controllers are thin — an `if` beyond extracting `@CurrentOrgContext()`/`@Body()`
  belongs in the service.
- Every DTO uses `class-validator`; the global pipe rejects unknown fields
  (`forbidNonWhitelisted: true`) — don't type a controller parameter as a plain
  interface to bypass this.
- Tests live next to the code (`*.spec.ts` for Jest in `apps/api`, `*.test.ts` for
  Vitest everywhere else), not in a parallel `__tests__` tree.
- New feature module in `apps/api`: controller (thin) + service (logic) + DTO(s) +
  `.spec.ts` for the service + import `AuthCommonModule` if it needs
  `OrgAuthGuard`/`RolesGuard`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| API fails to boot with an env-validation error | A required var in `apps/api/.env` is missing/too short — see `.env.example` |
| `docker compose up` Postgres fails `CREATE EXTENSION vector` | Not using the `pgvector/pgvector:pg16` image — check `docker-compose.yml` wasn't swapped for plain `postgres` |
| Repo stuck in `PENDING`/`INDEXING` | Worker isn't running, or Redis isn't reachable — check `npm run dev:worker`'s logs |
| Dashboard redirect-loops to `/login` | `NEXT_PUBLIC_API_URL` wrong, or API/web CORS origin mismatch — see `docs/deployment-vercel.md` |
| `/v1/query` 400 "Repository is not ready" | Wait for ingestion to finish, or check the worker's logs for a `FAILED` status and its `lastError` |

More: `docs/runbook.md`.
