# Deploying `apps/web` to Vercel

Only the dashboard (`apps/web`) deploys to Vercel. The API and worker deploy to
Railway — see `docs/deployment-railway.md`.

## 1. Prerequisites

- The API is already deployed (or running locally) and you have its public URL.
- A Vercel account with access to import this repository.

## 2. Import the project

1. In Vercel: **Add New → Project → Import Git Repository**, select this repo.
2. **Root Directory**: set to `apps/web` (this is the important step for a monorepo —
   Vercel needs to know which workspace to build).
3. Framework preset: Vercel auto-detects Next.js from `apps/web/package.json`.
4. Build command / output: leave as Vercel's Next.js defaults
   (`next build`, `.next`) — no override needed.
5. Install command: leave as default. Vercel runs the install from the repo root when
   npm workspaces are detected, which correctly resolves `@pr-pilot/ui` and
   `@pr-pilot/types` via the workspace.

## 3. Environment variables

Set in the Vercel project's **Settings → Environment Variables** (Production and
Preview):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your deployed API's URL, e.g. `https://pr-pilot-api.up.railway.app` |

No other secrets are needed on the web app — it never talks to Postgres, Redis, or the
LLM providers directly; it only calls the API.

## 4. CORS

The API's `CORS_ORIGIN` env var must exactly match your Vercel deployment's origin
(e.g. `https://pr-pilot.vercel.app`) for the dashboard's cookie-based session to work
(`credentials: "include"` requests are blocked by the browser otherwise). Update it on
the Railway API service and redeploy if you add a custom domain or a preview URL you
want to test against.

## 5. Deploy

Push to your default branch (or click **Deploy** in the Vercel dashboard). Vercel
rebuilds automatically on every push once connected.

## 6. Verify

1. Visit the deployed URL → `/register` → create an org.
2. Confirm the session cookie is set (DevTools → Application → Cookies →
   `pr_pilot_session`, `HttpOnly` + `Secure` should both be checked in production).
3. `/dashboard` should load your org without a redirect loop back to `/login`.

## Troubleshooting

- **Redirect loop to `/login`**: `NEXT_PUBLIC_API_URL` is wrong, or the API's
  `CORS_ORIGIN` doesn't match this Vercel origin exactly (including `https://`, no
  trailing slash).
- **Cookie not set / 401 on every request**: the API's `COOKIE_DOMAIN` and
  `sameSite`/`secure` settings assume production runs over HTTPS on different domains
  from the web app — confirm the API is actually reachable over HTTPS, not HTTP.
- **Build fails resolving `@pr-pilot/ui`**: confirm "Root Directory" is `apps/web`
  (not the repo root) and that Vercel's install step ran at the monorepo root
  (check the build log's first few lines for `npm install` output covering all
  workspaces, not just `apps/web`).
