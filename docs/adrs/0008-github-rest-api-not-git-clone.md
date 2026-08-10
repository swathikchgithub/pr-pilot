# ADR 0008: Ingest via the GitHub REST API, not `git clone`

## Status
Accepted

## Context
The worker needs the full file tree and contents of a repo at a given branch. The
obvious approach is shelling out to `git clone` on a persistent volume; the alternative
is GitHub's REST API (`git/trees` + `git/blobs`).

## Decision
Use the GitHub REST API exclusively (`GithubClient.fetchTree` / `fetchBlobContent`).
No `git` binary, no disk clone, no working directory to clean up.

## Consequences
- The worker container needs no git installation and no writable disk beyond the OS
  default — simpler Dockerfile, works identically on any container platform (Railway,
  Fly, ECS) without volume configuration.
- Rate-limited to GitHub's API limits (5,000 req/hr authenticated via `GITHUB_TOKEN`,
  60/hr unauthenticated) rather than git's own transfer limits — `GithubClient` retries
  once on `403` respecting `X-RateLimit-Reset`.
- Trade-off: one API call per file (`git/blobs`) instead of a single clone — fine for
  the file-count range this MVP targets, but a large monorepo (10k+ files) would want
  batched/tree-based content fetching in v2 rather than per-file blob requests.
