# Deploying `apps/api` and `apps/worker` to Railway

Railway hosts the API, the worker, Postgres (with pgvector), and Redis. The dashboard
(`apps/web`) deploys to Vercel — see `docs/deployment-vercel.md`.

## 1. Create the project and infra services

1. Railway → **New Project** → **Deploy from GitHub repo**, select this repo.
2. Add a **Postgres** database. Railway's default Postgres image does not ship
   `pgvector` — either:
   - swap the service's image to `pgvector/pgvector:pg16` (Railway lets you override
     the Docker image on a database service), or
   - use a managed Postgres provider that has pgvector pre-enabled (e.g. Supabase,
     Neon) and just set `DATABASE_URL` to point at it instead of a Railway-hosted DB.
3. Add a **Redis** service (Railway's official Redis template).

## 2. Create the API service

1. In the project, **New Service → GitHub Repo** (same repo again).
2. **Settings → Root Directory**: `/` (repo root — the Dockerfile needs the whole
   monorepo as build context, see ADR-adjacent note in `infra/docker/api.Dockerfile`).
3. **Settings → Build**: Builder = **Dockerfile**, Dockerfile path =
   `infra/docker/api.Dockerfile`.
4. **Settings → Networking**: generate a public domain; note the port is `4000`
   (matches `EXPOSE 4000` in the Dockerfile and the app's `PORT` env var default).
5. **Settings → Deploy**: health check path `/health`.

### API environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Railway Postgres connection string (or your external pgvector-enabled Postgres) |
| `REDIS_URL` | Railway Redis connection string |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `12h` |
| `API_KEY_PEPPER` | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Your Vercel dashboard URL, e.g. `https://pr-pilot.vercel.app` |
| `COOKIE_DOMAIN` | Leave blank unless you're on a custom domain shared with the web app |
| `GOOGLE_GENERATIVE_AI_API_KEY` | From Google AI Studio |
| `COHERE_API_KEY` | From the Cohere dashboard |
| `NODE_ENV` | `production` |

### Run the initial migration

Once the service has `DATABASE_URL` set, run once (Railway's one-off command runner,
or from your machine pointed at the Railway DB):
```bash
npm run db:migrate -w @pr-pilot/db
```

## 3. Create the worker service

1. **New Service → GitHub Repo** (same repo, again).
2. **Root Directory**: `/`. **Builder**: Dockerfile, path
   `infra/docker/worker.Dockerfile`.
3. No public networking needed — it only consumes the Redis queue.

### Worker environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Same as the API service |
| `REDIS_URL` | Same as the API service |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Same as the API service |
| `GITHUB_TOKEN` | A GitHub PAT with `repo:read` — raises rate limits, required for private repos |

## 4. Deploy order

1. Postgres + Redis up and reachable.
2. Run the migration (Section 2).
3. Deploy the API service; confirm `GET /<api-domain>/health` returns `200`.
4. Deploy the worker service; check its logs for
   `"PR-Pilot worker started, listening for ingestion jobs"`.
5. Deploy the web app to Vercel pointed at the API's domain.

## 5. Verify end-to-end

1. Register an org on the deployed dashboard.
2. Register a small public repo.
3. Watch the worker's Railway logs — you should see the structured JSON log lines for
   `Indexing ...`, `Found N ingestible files`, `Indexed N chunks`.
4. Repo status flips to `READY` in the dashboard within a minute or two for a small repo.
5. Ask a question in the Playground and confirm a cited answer comes back.

## Troubleshooting

- **Worker logs `githubUrl is not a valid ...` and repo immediately `FAILED`**: the
  `CreateRepoDto`/`parseGithubUrl` only accept `https://github.com/<owner>/<repo>` —
  no `.git` suffix issues (that's stripped), but SSH URLs (`git@github.com:...`) are
  rejected by design.
- **Worker stuck in `INDEXING` forever**: check the worker service's logs for a GitHub
  403 (rate limit) — set `GITHUB_TOKEN` if you haven't. Also confirm Redis is reachable
  from both services (same `REDIS_URL`).
- **API returns 503 on `/health`**: `DATABASE_URL` is wrong, or the pgvector extension
  isn't installed on that Postgres instance — `CREATE EXTENSION vector;` must succeed,
  which requires an image/provider that ships the extension (plain Railway Postgres
  does not, by default — see Section 1).
- **`/v1/query` returns 500 intermittently**: check for Gemini/Cohere API key issues in
  the API's logs; reranking failures are handled gracefully (falls back to hybrid-search
  order), but embedding/generation failures are not currently retried at the request
  layer — see `docs/runbook.md`.
