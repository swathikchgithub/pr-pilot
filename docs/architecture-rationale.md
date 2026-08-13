# Architecture Rationale, Trade-offs, and Limits

This doc answers three questions that `docs/architecture.md` (the diagrams/flows) and
`docs/adrs/` (individual decisions) don't answer directly in one place: **why this shape
overall**, what it costs, and **what the product can and can't actually handle today**.

Numbers below are derived by reading the code (file/line references included), not from
load testing — this repo has no load-testing infrastructure yet. Treat capacity figures
as reasoned estimates, not benchmarks.

## Why this architecture

The core design bet: **three independently-deployable services sharing one Postgres
schema**, chosen because the product has three genuinely different workloads —

- `apps/web`: human-facing, low-traffic, no business logic.
- `apps/api`: request/response, needs to be fast and horizontally scalable, holds all
  business logic and auth.
- `apps/worker`: long-running background jobs (seconds to minutes per repo), needs
  bounded concurrency and retry semantics, must never block the API's request thread.

Splitting these lets each scale on its own axis (see `docs/architecture.md` §8) and
deploy independently. The alternative — one monolith doing ingestion synchronously
inside an API request — was rejected specifically because ingestion latency is
unbounded and would tie up request-handling capacity (ADR 0006).

Every other structural decision follows from that split: Postgres+pgvector over a
dedicated vector DB because hybrid search needs relational joins alongside vector
similarity in the same query (ADR 0003); NestJS over Next.js API routes because the API
needed to be a standalone, independently-scaled service with real DI for the
retrieval-pipeline services (ADR 0002); BullMQ/Redis as the boundary between API and
worker so ingestion is retryable and non-blocking (ADR 0006); the GitHub REST API
instead of `git clone` so the worker container needs no disk/git binary (ADR 0008); a
heuristic regex/brace-depth chunker instead of tree-sitter, explicitly as a v1 with a
documented upgrade path (ADR 0007). Full context for each: `docs/adrs/`.

## Advantages

- **Independent scaling and failure isolation.** A slow/stuck ingestion job can't
  starve API request capacity — they're different processes, potentially different
  machines. `apps/api` is stateless and can run N replicas behind a load balancer with
  no coordination needed (`docs/architecture.md` §8).
- **Single source of truth for the schema.** `packages/db/prisma/schema.prisma` is the
  only place the schema is defined; both apps depend on the same generated Prisma
  Client, so they can't drift out of sync with each other (ADR 0003).
- **No infra sprawl.** One Postgres instance serves both relational data and vector
  search — no separate vector DB to run, back up, or keep consistent with the
  relational side.
- **Ingestion is resumable and non-destructive under failure.** `persistChunks`
  (`apps/worker/src/ingest/persist-chunks.ts`) deletes and re-inserts a repo's chunks
  inside a single transaction, so a failed re-ingestion never leaves a repo half-updated
  — it's still serving the previous good set of chunks until the new ingestion commits.
- **Query-time cost is decoupled from repo size.** Regardless of how large a repo is,
  a query only ever sends the top 8 reranked chunks (`RERANK_TOP_N` in
  `query.service.ts:12`) to the LLM — repo size affects ingestion time and storage, not
  query latency or prompt/context-window risk.

## Disadvantages / trade-offs accepted

- **Two services to deploy, monitor, and keep in sync**, vs. one. Every deploy touches
  either `api`, `worker`, or both, and a schema change must be coordinated across both
  (mitigated by the shared `@pr-pilot/db` package, not eliminated by it).
- **Eventual consistency between registration and readiness.** `POST /v1/repos`
  returns immediately with `status: PENDING` — the repo isn't queryable until the
  worker actually finishes, which could be seconds or (for a large repo) much longer,
  with no push notification; the dashboard polls.
- **Heuristic chunking, not a real parser** (ADR 0007). Free-standing top-level
  statements between symbols aren't separately indexed, deeply nested or unusually
  formatted code can miss chunk boundaries, and language support is capped to what the
  brace/Python heuristics recognize (`apps/worker/src/chunking/structural-chunker.ts`).
- **Single embedding/generation provider (Google Gemini), single reranker (Cohere), no
  fallback provider.** If Gemini's API is down or a model ID is retired (this happened
  twice in production during this project's own shakedown — see git history), every
  ingestion and every query fails until the code is updated and redeployed. Reranking
  degrades gracefully (falls back to hybrid-search order, `rerank.service.ts:56-57`);
  embedding and generation do not.
- **No integration tests against real Postgres/Redis** — documented in
  `docs/testing-guide.md`. The two type-mismatch bugs in `match_code_chunks_hybrid`
  (bigint/int parameter binding, numeric/float return type) were only caught by
  actually running the pipeline against live infrastructure, not by the test suite,
  because everything currently mocks `PrismaService`.

## Bottlenecks

Ranked roughly by how likely each is to actually bite first, based on current code:

1. **Ingestion fetches file blobs one at a time, sequentially, not batched or
   parallelized** (`apps/worker/src/ingest/ingest-repo.ts:40-41`: a plain `for` loop
   awaiting `github.fetchBlobContent` per file). For a repo with 1,000 ingestible
   files, that's 1,000 sequential GitHub API round-trips before embedding even starts.
   ADR 0008 flags this explicitly as a v2 concern for 10k+ file repos.
2. **Worker concurrency is fixed at 2 jobs at a time, per worker replica**
   (`CONCURRENCY = 2` in `apps/worker/src/processor.ts:7`). If 5 orgs register repos
   simultaneously, 3 sit queued in Redis behind the first 2 — there is currently only
   one worker replica running in production.
3. **GitHub's tree API truncates silently past its size limit, and the code doesn't
   check for it.** `fetchTree` requests `?recursive=1` and GitHub returns a `truncated`
   boolean when the tree exceeds its internal limit — `GithubClient.fetchTree`
   (`apps/worker/src/github/github-client.ts:19-23`) destructures `truncated` off the
   response but never reads it. A repo whose tree gets truncated would silently index
   only part of itself with no error, no warning, and `status: READY`.
4. **GitHub API rate limit**: 5,000 requests/hour with `GITHUB_TOKEN` set, 60/hour
   without (ADR 0008). Given point 1, a single large ingestion run can consume a large
   fraction of that hourly budget by itself; multiple large repos ingesting in the same
   hour compete for the same budget.
5. **Single Postgres instance, unbounded-growth table.** `code_chunks` is the only
   table that grows with usage; HNSW (vector) and GIN (full-text) indexes keep both
   search paths sub-linear in practice, but there's no partitioning yet — documented in
   `docs/architecture.md` §8 as the next step if a single instance becomes the ceiling.
   Prisma's connection pool also defaults to a small size on small containers (no
   explicit `connection_limit` is set anywhere in this codebase), which caps concurrent
   query throughput per `api`/`worker` instance under load.
6. **No caching layer.** Every `/v1/query` re-embeds the question, re-runs hybrid
   search, and re-calls the reranker and the LLM — identical repeated questions cost
   the same as novel ones.

## How large a repo can it handle

There's no tested ceiling — this is a derived estimate, not a benchmark:

- **Per-file cap: 500 KB** (`MAX_FILE_SIZE_BYTES` in
  `apps/worker/src/github/file-filters.ts:12`). Larger files are skipped entirely, not
  truncated or partially indexed.
- **File-type allowlist**, not the whole repo: only
  `.ts .tsx .js .jsx .mjs .cjs .py .go .java .rb .rs .c .h .cpp .hpp .cs .php .kt .swift
  .scala` are ingestible (`file-filters.ts:1-5`, `CODE_EXTENSIONS`) — a repo's total
  file count isn't what matters, its *ingestible* file count is.
- **Practical rate-limit ceiling**: with `GITHUB_TOKEN` set and the current sequential
  one-request-per-blob fetch, roughly 5,000 ingestible files is the hard upper bound
  ingestible in a single hour before hitting GitHub's rate limit — in practice
  meaningfully lower once you count the tree request and any 403 backoff retries
  (`RATE_LIMIT_MAX_RETRIES = 2` in `github-client.ts:4`). A repo in the low hundreds to
  low thousands of ingestible files should ingest in well under a minute; a repo with
  several thousand ingestible files could take many minutes to over an hour, serialized
  behind whatever else is in the worker's queue (bottleneck #2 above).
- **Untested territory**: repos whose GitHub tree response gets truncated (very large
  monorepos — GitHub's own docs put this in the tens-of-thousands-of-entries range) will
  silently under-index (bottleneck #3). This repo has not been tested against anything
  that large.
- **No per-org or per-repo storage quota** exists in the schema or application logic —
  nothing currently stops an org from registering an unbounded number of large repos.

## Functional limits of the product today

Hard constraints as currently implemented, useful to know before demoing or scoping
real usage:

| Limit | Value | Where |
|---|---|---|
| Max file size ingested | 500 KB | `file-filters.ts:12` |
| Ingestible file types | 19 extensions (see above), no Markdown/docs/config | `file-filters.ts:1-5` |
| One branch per repo | `defaultBranch` is a single stored string; no multi-branch tracking | `schema.prisma` `Repo` model |
| `matchCount` (chunks retrieved per query) | 5–50, default 20 | `query.dto.ts:11-15` |
| Chunks actually sent to the LLM | top 8 after rerank (query), top 12 (impact analysis) | `query.service.ts:12`, `impact.service.ts:14` |
| API rate limit | 120 requests/minute, global, per the `ThrottlerModule` default (IP-keyed) | `app.module.ts:23` |
| Request body size | Express/Nest default (~100 KB) — not raised for the `diff` field on `/v1/impact-analysis`, which has a minimum-length check but no explicit maximum | `impact-analysis.dto.ts`, `main.ts` |
| Embedding dimensionality | fixed at 768, hardcoded into the `vector(768)` column | `schema.prisma`, both embedding services |
| Repo registration | GitHub only, `https://github.com/<owner>/<repo>` — no GitLab/Bitbucket, no SSH URLs (rejected by design) | `github-url.util.ts` |
| Retry on a `FAILED` repo | None — no retry or delete endpoint exists yet; re-registering the same URL for the same org 409s | `repos.controller.ts`, `repos.service.ts:22-27` |
| Reranking | Falls back gracefully to hybrid-search order if Cohere is unreachable | `rerank.service.ts:56-57` |
| Embedding/generation provider outage | Hard failure, no fallback provider — every ingestion and query fails until resolved | N/A (no fallback exists) |
| Multi-tenancy isolation | Every data-access query is scoped by `orgId` from a verified `OrgContext`; no endpoint accepts an org ID from the request body for authorization | `docs/architecture.md` §7 |
