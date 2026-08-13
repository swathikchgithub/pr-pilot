# Recording Script (Product Walkthrough)

A shot-by-shot script for recording a screencast of PR-Pilot end to end. This is the
technical companion to the narrative beats in
[`go-to-market.md`](go-to-market.md#5-demo-script-for-investors-design-partners-or-a-recorded-walkthrough)
— that doc has the pitch; this one has the exact commands and clicks.

**Known gap:** the dashboard (`apps/web`) only wires up the query flow
(`/dashboard/playground`). There is no impact-analysis page in the UI yet — Scene 4 is
recorded from a terminal (`curl` or the SDK), not the browser. Say so on camera rather
than implying a UI that doesn't exist.

## Pre-recording checklist

- [ ] Fresh terminal, large font (16pt+), clean prompt (no long `PS1` paths)
- [ ] Browser window: hide bookmarks bar, 1280×800 or larger, zoom at 100%
- [ ] `npm run dev:api`, `npm run dev:worker`, `npm run dev:web` all running and healthy
      (`curl localhost:4000/health` → `{"status":"ok"}`)
- [ ] A throwaway org — register fresh on camera, don't reuse seeded demo data (it should
      look real, not canned)
- [ ] A real public GitHub repo picked in advance that indexes in under ~60s of screen
      time (a small-to-medium repo — this repo itself works well since the example
      questions below are grounded in it)
- [ ] `PR_PILOT_API_KEY` **not** pre-exported — Scene 2 creates it live
- [ ] Screen recorder running with a few seconds of buffer before/after each scene for
      clean cuts

## Scene 1 — Open with the pain (~30s, talking head or title card)

No screen action. Talk track (from `go-to-market.md`):

> "Your AI agents are already shipping PRs. Can you tell me, right now, what context an
> agent read before its last change? Most teams can't."

## Scene 2 — Register an org and a repo (~60–90s)

1. Browser: `http://localhost:3000` → **Register**
2. Fill in email / password / org name → submit. Lands on `/dashboard`.
3. Navigate to **Repositories** (`/dashboard/repos`).
4. Paste the GitHub URL into the form, submit.
5. Let the status badge run `PENDING → INDEXING → READY` on screen — the page polls
   every 5s, no manual refresh needed. Cut/speed up the wait in editing if it's slow;
   keep it live if the repo is small enough to finish in real time.

Talk track: name what's happening — "it's cloning the tree via the GitHub API, chunking
every source file, embedding each chunk, and once that's done the repo goes READY."

## Scene 3 — Playground: grounded, cited answers (~45–60s)

1. Navigate to **Playground** (`/dashboard/playground`).
2. Repo dropdown should already show the newly-READY repo.
3. Type one of the example questions (from `quickstart.md`) — pick whichever is true for
   the repo you indexed, e.g. for this repo itself:
   - "How does the OrgAuthGuard validate a request?"
4. Submit, let the answer render.
5. Click through one of the citation badges (`file.ts:10-40`) — if the UI doesn't deep
   link to GitHub yet, at minimum read the filename/line range out loud and note it's
   not a hallucinated reference.

Talk track: "Every answer comes back with citations pointing at the exact file and line
range it was grounded in — not a paraphrase, not a guess."

## Scene 4 — Impact analysis: the actual differentiator (~60–75s)

Recorded from a terminal, not the browser (see the gap noted above).

1. Grab the API key first — **API Keys** page (`/dashboard/api-keys`) → create one
   named something demo-appropriate, e.g. "Recording demo" → copy the secret (shown
   once).
2. Switch to terminal:
   ```bash
   export PR_PILOT_API_KEY="prp_..."
   export REPO_ID="repo_..."   # from the repos page or GET /v1/repos
   ```
3. Prepare a small, real diff against the indexed repo (a couple of changed lines is
   enough — don't invent an elaborate one). Save it as `demo.diff` or inline it.
4. Run it through the API:
   ```bash
   curl -s http://localhost:4000/v1/impact-analysis \
     -H "Authorization: Bearer $PR_PILOT_API_KEY" \
     -H "Content-Type: application/json" \
     -d "{\"repoId\": \"$REPO_ID\", \"diff\": $(jq -Rs . < demo.diff)}" | jq
   ```
   or the SDK equivalent from `quickstart.md`:
   ```ts
   const impact = await client.impactAnalysis({ repoId, diff: myDiff });
   ```
5. Let the response render: `riskLevel`, `affectedChunks` with `reason` +
   `relatedness`, `suggestedTests`.

Talk track (from `go-to-market.md`): "This is the moment that lands differently than
'another RAG demo' — it's not just answering a question, it's telling you what this
specific change puts at risk before it merges."

## Scene 5 — Audit log (~30–45s)

1. Browser: **Audit Log** (`/dashboard/audit-log`).
2. Point out both the Scene 3 query and the Scene 4 impact analysis are already logged
   — event type, truncated input, citation count, actor (dashboard user vs. API key),
   timestamp.

Talk track: "This is the part that becomes non-negotiable once you have 50 agents
running in CI, not 1 — every read is attributable."

## Scene 6 — Close with the SDK (~30s)

Terminal, large font, just the install + call:

```bash
npm install @pr-pilot/sdk
```
```ts
import { PrPilotClient } from "@pr-pilot/sdk";

const client = new PrPilotClient({ apiKey: process.env.PR_PILOT_API_KEY! });
const { answer, citations } = await client.query({ repoId, question });
```

Talk track: "Four lines of code — this is what ships inside a CI job. It's not just a
chat UI product."

## Total runtime

~4–5 minutes of screen time before editing (Scene 1 title card + Scenes 2–6). Trim
ingestion/loading waits in post; keep talk tracks close to the wording above so the
video and the written pitch in `go-to-market.md` stay consistent.
