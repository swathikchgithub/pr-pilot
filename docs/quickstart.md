# Quickstart

New to PR-Pilot? Start with [`getting-started.md`](getting-started.md) for the product
overview and architecture, then come back here to run it locally.

## Local setup

**Prerequisites**: Node ≥20, npm ≥10, Docker (for local Postgres/Redis).

```bash
git clone <this-repo>
cd pr-pilot
npm install

# Local infra: Postgres (pgvector) + Redis
docker compose up -d

# Copy env templates — see "Environment variables" below for what to fill in
cp .env.example apps/api/.env
cp .env.example apps/worker/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > apps/web/.env.local

# Generate the Prisma client and run the initial migration
npm run db:generate
npm run db:migrate:dev

# Optional: seed a demo org/repo/API key
npm run db:seed

# Run all three services (separate terminals)
npm run dev:api
npm run dev:worker
npm run dev:web
```

Visit `http://localhost:3000`, register an org, register a GitHub repo, and watch its
status move from `PENDING` → `INDEXING` → `READY` in the Repositories page.

## Example queries

Grounded questions about actual source code work best — the ingestion pipeline only
indexes recognized source-code file types (see `apps/worker/src/github/file-filters.ts`),
not markdown/docs, so broad "what is this project" questions may come back empty on
doc-heavy repos. Specific, code-level questions retrieve well, for example (asked
against this repo itself):

- "How does the OrgAuthGuard validate a request?"
- "How does the ingestion pipeline chunk a file?"
- "How is impact analysis computed from a diff?"

Each answer comes back with citations pointing at the exact file and line range it was
grounded in.

## Environment variables

See [`.env.example`](../.env.example) for the full annotated list (Postgres/Redis URLs,
`JWT_SECRET`, `API_KEY_PEPPER`, Gemini/Cohere keys, GitHub token, CORS origin). Each
app reads its own `.env`/`.env.local` — the root `.env.example` is the single template
you copy from.

**Never commit a populated `.env*` file.** They're gitignored by default; keep it that
way.

## Running tests

```bash
npm test              # every workspace
npm run typecheck     # every workspace
cd apps/api && npm run test:e2e   # HTTP-level auth flow integration test
```

105 tests pass across 7 workspaces as of this repository's last verified run (54 API
unit + 4 API e2e + 33 worker + 5 web + 5 SDK + 4 UI), with zero typecheck errors and
successful production builds for all three apps. Details, coverage notes, and honestly-
documented gaps: [`testing-guide.md`](testing-guide.md).

## Deploying

- **Dashboard → Vercel**: [`deployment-vercel.md`](deployment-vercel.md)
- **API + worker → Railway**: [`deployment-railway.md`](deployment-railway.md)

## Using the SDK (what an agent/CI job actually does)

```bash
npm install @pr-pilot/sdk
```
```ts
import { PrPilotClient } from "@pr-pilot/sdk";

const client = new PrPilotClient({ apiKey: process.env.PR_PILOT_API_KEY! });

const { answer, citations } = await client.query({
  repoId: "repo_...",
  question: "How does the auth middleware validate a session?",
});

const impact = await client.impactAnalysis({ repoId: "repo_...", diff: myDiff });
```
Full API reference: [`api-reference.md`](api-reference.md).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| API fails to boot with an env-validation error | A required var in `apps/api/.env` is missing/too short — see `.env.example` |
| `docker compose up` Postgres fails `CREATE EXTENSION vector` | You're not using the `pgvector/pgvector:pg16` image — check `docker-compose.yml` wasn't swapped for plain `postgres` |
| Repo stuck in `PENDING`/`INDEXING` | Worker isn't running, or Redis isn't reachable — check `npm run dev:worker`'s logs |
| Dashboard redirect-loops to `/login` | `NEXT_PUBLIC_API_URL` wrong, or API/web CORS origin mismatch — see `deployment-vercel.md` |
| `/v1/query` 400 "Repository is not ready" | Wait for ingestion to finish, or check the worker's logs for a `FAILED` status and its `lastError` |

More: [`runbook.md`](runbook.md).
