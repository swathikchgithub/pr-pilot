# PR-Pilot — Product Requirements Document

## 1. Product vision

AI coding agents (Claude Code, Cursor agents, Devin, internal agents wired into CI) are
increasingly authoring and merging code with minimal human review. Engineering
organizations adopting them face two problems at once: agents hallucinate repo context
they don't actually have, and nobody has a governed record of what an agent read or
changed before it acted.

**PR-Pilot is the context and governance layer for AI coding agents** — a hosted API
that gives agents and CI pipelines grounded, cited retrieval over a codebase, blast-radius
impact analysis on any diff before merge, and a full audit trail of every query and its
citations for compliance review. The dashboard is a secondary, human-facing surface over
the same API — not the product's primary interface.

## 2. Target customer (ICP)

Engineering organizations, roughly 80–2,000 developers, with meaningful AI-coding-agent
adoption in their development or CI workflow, where an engineering leader or platform
team is accountable for the risk of agent-authored changes.

## 3. User pain / JTBD

*"Let AI agents ship PRs fast, without flying blind on what they might break or losing
an audit trail of why."*

- Agents without grounded context hallucinate APIs, miss call sites, and generate
  plausible-looking but wrong code.
- Nobody can currently answer "what did the agent actually look at before making this
  change?" after the fact — a blocker for any org with change-management or compliance
  requirements around AI-authored code.
- Reviewers manually re-derive blast radius (what else might this touch?) on every
  agent-generated PR, which is exactly the kind of mechanical work agents were supposed
  to remove.

## 4. Why now

Autonomous coding agents moved from novelty to CI-embedded default in 2025–2026 faster
than governance tooling caught up. Existing code-search products (Sourcegraph Cody,
Glean, Copilot Chat) are built for a human typing a question into a chat box — they have
no API-first design for agents to call programmatically, and no audit/governance data
model, because that wasn't the problem they were built to solve.

## 5. Core moat

1. **Data flywheel** — retrieval and impact-analysis relevance improve per repo indexed
   and per logged outcome (did the suggested tests actually catch the regression, was
   the change reverted). More usage → better relevance → more usage.
2. **Workflow lock-in** — designed to sit as a required gate in CI before merge, not a
   tab a developer might or might not open.
3. **Compliance moat** — the audit-log schema (`AuditLogEntry`: who/what/citations/when)
   is purpose-built for the AI-governance requirements now showing up in SOC2 and
   internal AI-usage policies; retrofitting this onto a chat-first product is expensive.

## 6. MVP scope (this repository)

### In scope
- GitHub repo ingestion: fetch tree/blobs via the GitHub API, heuristic structural
  chunking (function/class/method-aware — see ADR 0007), embed with Gemini
  `text-embedding-004`, store in Postgres/pgvector.
- Hybrid retrieval: vector similarity + full-text search merged via Reciprocal Rank
  Fusion, cross-encoder reranked (Cohere), answered with Gemini and strict inline
  citations (`[filename:Lstart-Lend]`).
- Impact analysis: given a unified diff, return a risk level, affected code chunks with
  reasons, and suggested tests — grounded the same way (retrieval → rerank → structured
  LLM output), never hallucinated file/line references (unmatched model output is
  dropped, not surfaced — see `impact-generation.service.ts`).
- Multi-tenant orgs, dashboard-user auth (email/password), API keys for agents/CI.
- Governance audit log: every query and impact analysis, with its citations, queryable
  and paginated.
- Dashboard: register repos, manage API keys, a playground to try queries, and the
  audit log viewer.
- `@pr-pilot/sdk`: the TypeScript client an agent or CI job actually installs.

### Explicitly out of scope for v1
- SSO/SAML, social login, MFA (see ADR 0005).
- Multi-branch indexing (one `defaultBranch` per repo at a time).
- Non-GitHub sources (GitLab, Bitbucket, local/on-prem repos).
- Automatic re-indexing on push (ingestion is triggered manually via the API/dashboard
  today; webhook-triggered re-ingestion is v2).
- Fine-grained per-repo RBAC beyond org-level roles.

## 7. Key user journeys

1. **Onboard**: sign up → org created → register a GitHub repo → worker indexes it →
   status flips `PENDING → INDEXING → READY` in the dashboard.
2. **Wire up an agent**: create an API key in the dashboard → install `@pr-pilot/sdk` in
   the agent/CI job → call `query()`/`impactAnalysis()` with that key.
3. **Ask a question (human)**: Playground → pick a `READY` repo → ask a question → see
   the cited answer.
4. **Pre-merge gate (agent/CI)**: CI job calls `impactAnalysis({ repoId, diff })` on the
   PR's diff → surfaces risk level + suggested tests as a PR check.
5. **Audit review**: compliance/eng-lead opens Audit Log → filters by repo/event type →
   inspects exactly what was retrieved and answered for any past query.

## 8. Acceptance criteria (representative)

- Registering a repo with a non-GitHub URL is rejected with `400` before any DB write.
- Registering the same `githubUrl` twice for the same org is rejected with `409`.
- `/v1/query` and `/v1/impact-analysis` reject with `400` if the target repo's status
  isn't `READY`.
- An API key that has been revoked is rejected with `401` on every subsequent call,
  and its `lastUsedAt` no longer advances.
- An impact-analysis response never contains a filename/line range that wasn't part of
  the retrieved candidate set (model hallucinations are filtered, not passed through).
- Every `/v1/query` and `/v1/impact-analysis` call produces exactly one `AuditLogEntry`,
  regardless of whether the caller was a dashboard session or an API key.

## 9. Edge cases handled

- Repo has zero ingestible files (e.g., a docs-only repo) → ingestion completes with
  `chunkCount: 0`, `READY`, not `FAILED`.
- Cohere reranking is down → falls back to hybrid-search order rather than failing the
  request (reranking is a quality improvement, not a hard dependency).
- Model doesn't follow the citation format in its answer → citations fall back to all
  retrieved chunks rather than returning zero citations.
- GitHub API rate-limited mid-ingestion → one retry honoring `X-RateLimit-Reset`, then
  the job fails and BullMQ retries with backoff; the repo surfaces `FAILED` with the
  error message if all attempts are exhausted.

## 10. Admin/operator needs

- Runbook for a stuck/failed ingestion job (see `docs/runbook.md`).
- Health check endpoint (`GET /health`) for uptime monitoring, checking DB reachability.
- Structured JSON logs from both the API and worker for aggregation.

## 11. Version 2 roadmap

- Webhook-triggered re-ingestion on push (keep the index fresh automatically).
- tree-sitter-based chunker (ADR 0007's upgrade path) for exact AST boundaries.
- GitLab/Bitbucket ingestion sources.
- Per-repo access control beyond org role (team-level scoping).
- Outcome feedback loop: capture whether a suggested test actually caught a regression,
  feed back into reranking/relevance (the data-flywheel moat, made concrete).
- SSO (Clerk/Auth.js swap-in — see ADR 0005).

## 12. Billion-dollar expansion path

Wedge: context + governance API for AI coding agents, sold to engineering orgs adopting
agentic coding. Platform expansion: once an org's entire agent fleet (Claude Code,
Cursor, Devin, in-house agents) routes context and pre-merge checks through PR-Pilot,
the same audit/citation data becomes the natural place to build (a) an AI-change
compliance product for security/compliance teams, and (b) a cross-agent benchmarking
and outcome-tracking layer — the thing every engineering org will eventually need to
answer "which of our agents are actually safe to trust with which kinds of changes."
