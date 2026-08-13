# Getting Started

**The context and impact-analysis layer for AI coding agents.**

AI coding agents (Claude Code, Cursor agents, Devin, in-house agents wired into CI) are
shipping PRs faster than engineering orgs can govern them. PR-Pilot gives those agents
and CI pipelines grounded, cited retrieval over a codebase and pre-merge blast-radius
analysis on any diff — plus a full audit trail of every query and citation, for the
compliance review every org adopting agentic coding eventually needs.

The dashboard is a secondary, human-facing surface over the same API — the API and
`@pr-pilot/sdk` are the product's primary interface.

Full product/strategy context: [`prd.md`](prd.md) ·
[`go-to-market.md`](go-to-market.md).

## Who this is for

Engineering organizations (roughly 80–2,000 developers) with real AI-coding-agent
adoption in their dev workflow or CI, where someone is accountable for the risk of
agent-authored changes.

## Architecture at a glance

```
apps/web     Next.js dashboard (Vercel)
apps/api     NestJS API — auth, orgs, repos, query, impact analysis, audit log (Railway)
apps/worker  BullMQ ingestion worker — fetch, chunk, embed (Railway)
packages/*   types (shared DTOs), db (Prisma schema, single source of truth),
             ui (shared components), sdk (agent/CI client), config (shared tooling)
```

Postgres (with `pgvector`) is the datastore; Redis backs the ingestion job queue;
Google Gemini provides embeddings + generation; Cohere provides reranking.

Full diagrams and request/ingestion sequence flows: [`architecture.md`](architecture.md).
Technical design (algorithms, complexity, module boundaries): [`tdd.md`](tdd.md).
Design decisions and their trade-offs: [`adrs/`](adrs/).
Why this architecture overall, its advantages/disadvantages, bottlenecks, and current
functional limits: [`architecture-rationale.md`](architecture-rationale.md).

## Next steps

- Set up a local environment and run your first query: [`quickstart.md`](quickstart.md)
- Call the API directly or via `@pr-pilot/sdk`: [`api-reference.md`](api-reference.md)
