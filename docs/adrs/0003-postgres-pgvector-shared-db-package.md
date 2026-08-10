# ADR 0003: Postgres + pgvector, schema owned by a shared `@pr-pilot/db` package

## Status
Accepted

## Context
Both `apps/api` (query-time hybrid search) and `apps/worker` (write-time chunk
persistence) need the same database schema and the same generated Prisma Client.
Duplicating `schema.prisma` in both apps would violate single-source-of-truth and let
the two services drift out of sync.

## Decision
- Use **Postgres with the `pgvector` extension** (not a separate vector DB) — one
  fewer moving part, and hybrid search needs relational joins (org/repo scoping)
  alongside vector similarity, which a dedicated vector DB would complicate.
- Own the Prisma schema, migrations, and generated client in **`packages/db`**.
  `apps/api` and `apps/worker` both depend on `@pr-pilot/db` and never touch
  `@prisma/client` directly.
- The `code_chunks.embedding` column is `vector(768)` (Google `text-embedding-004`
  output size), declared via Prisma's `Unsupported("vector(768)")` since Prisma Client
  can't read/write pgvector columns natively — all embedding reads/writes go through
  raw SQL (`$queryRaw`/`$executeRaw`), isolated in `HybridSearchService` (api) and
  `persist-chunks.ts` (worker).

## Consequences
- One migration history, one generated client — api and worker can never disagree on
  the schema.
- The hybrid search itself (vector cosine + full-text, merged via Reciprocal Rank
  Fusion) is implemented as a Postgres function (`match_code_chunks_hybrid`) rather
  than in application code, so the merge logic runs where the data lives instead of
  round-tripping two result sets over the network.
