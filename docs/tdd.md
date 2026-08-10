# Technical Design Document

See `docs/architecture.md` for the system-level diagrams. This document covers
component-level design decisions, key algorithms, and their complexity.

## 1. Module boundaries (`apps/api`)

| Module | Owns | Depends on |
|---|---|---|
| `auth` | Registration, login, session issuance | `PrismaService`, `SessionTokenService` |
| `common/api-key-auth` | API key validation (leaf module, no CRUD) | `PrismaService` |
| `api-keys` | API key CRUD (create/list/revoke) | `common/auth-common` |
| `orgs` | Org read | `common/auth-common` |
| `repos` | Repo CRUD, ingestion job enqueue | `common/auth-common` |
| `retrieval` | Embedding, hybrid search, rerank, generation | `PrismaService`, Gemini, Cohere |
| `query` | Orchestrates retrieval -> answer -> audit | `repos`, `retrieval`, `audit` |
| `impact` | Orchestrates retrieval -> structured impact analysis -> audit | `repos`, `retrieval`, `audit` |
| `audit` | Audit log write + paginated read | `PrismaService` |
| `common/guards` | `OrgAuthGuard` (dual credential), `RolesGuard` | `api-key-auth`, `token` |

Every feature module depends inward on `common`, never the reverse — `common` has no
knowledge of `repos`/`query`/`impact` (Dependency Inversion, Section 5 of the
engineering guidelines).

## 2. Key algorithms and complexity

### Hybrid search (Reciprocal Rank Fusion)
Implemented as a Postgres function, `match_code_chunks_hybrid`
(`packages/db/prisma/migrations/.../migration.sql`). For a repo with `n` chunks:
- Vector scan: `O(log n)` via the `hnsw` index (approximate nearest neighbor).
- Full-text scan: `O(log n)` via the `gin` index.
- RRF merge of the two ranked lists: `O(k)` where `k = match_count * 2` (bounded, not
  proportional to `n`).

### Structural chunking (`apps/worker/src/chunking/structural-chunker.ts`)
- Brace-language extraction: `O(n · d)` where `n` is the file's character count and `d`
  is max class-nesting depth (each nesting level rescans its own body once to find
  inner methods — see ADR 0007). `d` is small in practice (1-2).
- Python extraction: `O(n)` over lines, single pass with indentation tracking.
- Window fallback: `O(n)` over lines.

### API-key hashing (`common/api-key-auth`)
Keyed SHA-256 (`secret + server pepper`), looked up by **indexed equality** on the
hash column — `O(1)` (index lookup), not a prefix-scan-then-compare. Chosen over bcrypt
because the secret already carries 256 bits of entropy from `crypto.randomBytes(32)`;
bcrypt's per-comparison cost is unnecessary and would prevent an indexed lookup.

### Citation extraction (`retrieval/generation.service.ts`)
Single regex pass (`O(m)` over the answer's length `m`) mapping `[file:L-L]` markers
back to retrieved chunks via a `Map` for `O(1)` dedup lookups, with a full-candidate-set
fallback if the model cites nothing in the expected format.

## 3. Configuration and validation

- `apps/api`: `class-validator`-backed `EnvironmentVariables` class
  (`config/env.validation.ts`), invoked via `ConfigModule.forRoot({ validate })` — the
  process fails at boot with a clear message if any required env var is missing or
  malformed, never at first-request time (fail fast, Section 6).
- `apps/worker`: `loadConfig()` (`config.ts`) throws synchronously on `main()` entry for
  the same reason, without a class-validator dependency (worker has no HTTP layer, so a
  lighter-weight check is appropriate — YAGNI).
- Every HTTP input boundary uses a `class-validator` DTO with `whitelist: true,
  forbidNonWhitelisted: true` (global `ValidationPipe` in `main.ts`) — unexpected fields
  are rejected, not silently dropped or accepted.

## 4. Async flows

Only one asynchronous, queue-backed flow exists: repo ingestion (BullMQ, see ADR 0006
and the architecture doc's sequence diagram). Everything else (`/v1/query`,
`/v1/impact-analysis`, auth, API keys, audit log) is synchronous request/response —
deliberately, since none of those operations are long-running enough to justify queue
overhead, and synchronous flows are far easier to reason about and test.

## 5. Security implementation notes

- **AuthN/AuthZ separation**: `OrgAuthGuard` establishes identity (who is calling);
  `RolesGuard` establishes permission (what they can do). A request can be
  authenticated (valid API key) and still forbidden (API keys can't manage other API
  keys — see ADR 0004).
- **SQL injection**: the only raw SQL in the codebase is the pgvector similarity query
  and the batched chunk insert, both built with Prisma's tagged-template `$queryRaw`/
  `$executeRaw` (auto-parameterized) — never string concatenation. `toVectorLiteral()`
  additionally rejects non-finite numbers before the value ever reaches a query.
- **Prompt injection**: system prompts for both `GenerationService` and
  `ImpactGenerationService` explicitly delimit retrieved content as untrusted data and
  instruct the model to ignore embedded directives (Section 9.7 of the engineering
  guidelines).
- **Secrets**: `.env*` is gitignored everywhere except `.env.example`; the API key
  pepper and JWT secret are required, validated-length env vars, never hardcoded.
- **Error responses**: `HttpExceptionFilter` normalizes every thrown error into a fixed
  `{ statusCode, error, message }` shape and masks anything not already an
  `HttpException` as a generic 500 — stack traces and internal error text never reach
  the client (see its unit test asserting a Postgres connection string isn't leaked).

## 6. Testing strategy actually implemented

- **Unit**: pure utilities (chunker, diff parser, vector literal, slugify, API-key
  crypto) and services with all boundaries mocked (Jest for `apps/api`, Vitest for
  `apps/worker`/`apps/web`/packages).
- **Component**: `packages/ui` (React Testing Library) for `Button`/`Table`; `apps/web`
  for `StatusBadge`.
- **Integration/e2e**: `apps/api/test/auth.e2e-spec.ts` boots the real `AuthModule`
  through Nest's DI container and exercises it over HTTP via `supertest`, with only
  `PrismaService` mocked — this is what caught the module-export DI bug documented in
  ADR 0004, which no unit test (each mocking its own immediate dependencies) could have
  found.
- **Not yet implemented** (documented honestly rather than claimed): Playwright E2E
  against a fully running stack, and integration tests against a real Postgres/Redis
  (the `docker-compose.yml` local infra makes this straightforward to add — tracked as
  a v2 testing task in `docs/runbook.md`).

## 7. Deployment model

See `docs/deployment-vercel.md` and `docs/deployment-railway.md`. Summary: `apps/web`
on Vercel; `apps/api` and `apps/worker` as separate Railway services built from
`infra/docker/*.Dockerfile`; Postgres (pgvector) and Redis as Railway plugins/services.
