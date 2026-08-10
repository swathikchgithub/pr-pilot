# ADR 0006: BullMQ + Redis for repo ingestion, not a synchronous request

## Status
Accepted

## Context
Indexing a repository (fetch tree, fetch every file, chunk, embed, persist) can take
seconds to minutes depending on repo size, and must retry on transient GitHub/embedding
API failures without blocking the API request thread or losing work.

## Decision
`POST /v1/repos` only creates the `Repo` row (status `PENDING`) and enqueues a job on a
BullMQ queue (`repo-ingestion`, Redis-backed). A separate `apps/worker` process consumes
the queue with bounded concurrency, retries with exponential backoff, and updates the
repo's status (`INDEXING` → `READY`/`FAILED`) as it progresses.

## Consequences
- The API stays fast and stateless for this endpoint regardless of repo size.
- The worker scales independently of the API (more Railway worker replicas for a large
  backlog, without touching the API's resource allocation).
- Adds an operational dependency (Redis) beyond Postgres — justified by the alternative
  being either a request that can time out on large repos, or a bespoke polling/retry
  mechanism reinvented on top of Postgres, which BullMQ already solves correctly.
