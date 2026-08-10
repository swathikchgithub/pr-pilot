# Operations Runbook

## Service map

| Service | What it does if it's down |
|---|---|
| `apps/web` (Vercel) | Dashboard unreachable. API still usable directly by agents/CI/SDK. |
| `apps/api` (Railway) | Everything is down — dashboard and agents both depend on it. |
| `apps/worker` (Railway) | New/re-ingestion requests queue up in Redis but never process; existing indexed repos are unaffected and still queryable. |
| Postgres (Railway/external) | Total outage — API can't read/write anything. |
| Redis (Railway) | New repo registrations still create the `PENDING` row but the ingest job never gets picked up. |

## Health checks

- `GET /health` on the API — checks DB reachability, returns `503` if not.
- Worker has no HTTP endpoint; confirm liveness via its logs
  (`"PR-Pilot worker started, listening for ingestion jobs"` on boot) or by checking
  Redis for a growing, unconsumed queue depth.

## Incident: a repo is stuck in `INDEXING` or `PENDING`

1. Check the worker's logs for that `repoId`. Every log line includes `repoId` as
   structured JSON metadata — filter on it.
2. Common causes, in order of likelihood:
   - GitHub rate limit (`GithubApiError`, status 403) — the client retries once
     automatically; a second failure fails the whole job. Set/rotate `GITHUB_TOKEN`.
   - Gemini embedding API error — check `GOOGLE_GENERATIVE_AI_API_KEY` validity/quota.
   - Redis/Postgres connectivity from the worker specifically (separate from the API's
     connectivity — they're different services with their own env vars).
3. BullMQ retries failed jobs 3x with exponential backoff (`ingest-queue.service.ts`).
   If all retries are exhausted, the repo's `status` is `FAILED` with `lastError` set
   to the underlying message (truncated to 500 chars) — visible directly in the
   dashboard's Repositories table.
4. To force a re-index: re-`POST /v1/repos` with the same `githubUrl` will `409`
   (already registered) — there is no "re-ingest" endpoint in v1; the operator fix
   today is a direct DB update resetting `status` to `PENDING` and re-enqueuing via a
   one-off script, or deleting the `Repo` row and re-registering. **Tracked as a v2 gap
   — a proper `POST /v1/repos/:id/reindex` endpoint.**

## Incident: `/v1/query` or `/v1/impact-analysis` failing

1. Check the API's logs for the specific error (the `HttpExceptionFilter` logs full
   detail server-side even though it masks the response to the client).
2. If it's a Cohere error: no action needed, `RerankService` already falls back to
   unreranked hybrid-search order and logs a warning — this should not cause a request
   failure.
3. If it's a Gemini error (embedding or generation): check API key validity and quota.
   These are not currently retried at the request layer (see the TDD's testing-gap
   note) — a request-level retry/backoff for the LLM calls is a good first
   hardening task if this becomes frequent in production.
4. If it's a Postgres error on the hybrid-search RPC: confirm the `vector` extension
   and the `match_code_chunks_hybrid` function exist (they're created by the initial
   migration — re-run `npm run db:migrate -w @pr-pilot/db` if a fresh DB is missing
   them).

## Incident: dashboard shows a redirect loop between `/dashboard` and `/login`

See the troubleshooting section of `docs/deployment-vercel.md` — almost always a
`CORS_ORIGIN`/`NEXT_PUBLIC_API_URL` mismatch, not an application bug.

## Rotating secrets

- **JWT_SECRET**: rotating invalidates every existing dashboard session (users must
  log in again). No user data is lost.
- **API_KEY_PEPPER**: rotating invalidates **every existing API key** (the stored hash
  is `sha256(secret + pepper)` — changing the pepper makes every stored hash
  unverifiable). Plan a coordinated rotation: notify API key holders, rotate, have them
  re-create keys.
- **GOOGLE_GENERATIVE_AI_API_KEY / COHERE_API_KEY**: rotate freely, no data
  invalidation — just update the env var and redeploy the affected service(s).

## Known operational gaps (be aware, not surprised)

- No re-ingestion endpoint yet (see above).
- No automated backup/restore documentation for Postgres beyond your hosting
  provider's own defaults — set this up before real usage, it's not covered here.
- No alerting wired up out of the box — `/health` and structured logs are the
  primitives; connect them to your own uptime/log-aggregation tooling.
