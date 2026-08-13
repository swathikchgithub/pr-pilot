# Go-to-Market: Opportunity, Prioritization, Monetization, Launch

Companion to `docs/prd.md` (product scope) — this doc covers the venture/business side.

## 1. Opportunity assessment

| Dimension | Assessment |
|---|---|
| Market pain | High and growing — agentic coding adoption is outpacing governance tooling; every engineering leader adopting agents at scale eventually asks "what did it actually look at" |
| Differentiation | Agent-infra + governance framing is unclaimed; incumbents (Sourcegraph Cody, Glean, Copilot Chat) are human-chat-first, not agent-API-first |
| Speed to MVP | High — this repository is the MVP, built and verified in one pass |
| Monetization potential | Strong — usage-based API pricing has a natural expansion path per agent/CI job, plus a governance tier that scales with headcount/compliance requirements |
| Defensibility | Moderate-to-strong once live (data flywheel + workflow lock-in + compliance schema — see PRD §5); weak on day one before usage accumulates, like any flywheel business |
| Technical feasibility | Proven — every piece in this repo is implemented and tested, not vaporware |
| Founder-market fit | Depends on the operator; the product doesn't require novel research, just disciplined execution of known techniques (hybrid search, reranking, structured LLM output) |
| Platform expansion potential | High — same audit/citation data underpins both a compliance product and a cross-agent benchmarking layer (PRD §12) |

## 2. Feature prioritization matrix

| Feature | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| Grounded query API (`/v1/query`) | High | Medium | P0 | Shipped |
| Impact analysis API | High | Medium | P0 | Shipped |
| API keys + agent/CI auth | High | Low | P0 | Shipped |
| Audit log | High (the moat) | Low | P0 | Shipped |
| Dashboard (repos, keys, playground, audit) | Medium | Medium | P0 | Shipped |
| `@pr-pilot/sdk` | High (adoption unlock) | Low | P0 | Shipped |
| Webhook-triggered re-indexing | Medium | Medium | P1 | v2 |
| tree-sitter chunker | Medium | High | P1 | v2 (ADR 0007) |
| Outcome feedback loop (flywheel) | High (long-term moat) | High | P1 | v2 |
| GitLab/Bitbucket sources | Medium | Medium | P2 | v2 |
| SSO (Clerk/Auth.js) | Low until an enterprise deal needs it | Medium | P2 | v2 (ADR 0005) |
| Per-repo RBAC | Low pre-PMF | Medium | P3 | Backlog |

## 3. Monetization strategy

**Pricing hypothesis**: usage-based, two axes.
- **Per-repo indexed** (covers ingestion compute + storage) — flat monthly fee per
  actively-indexed repo above a free tier (e.g., 1 repo free, then per-repo pricing).
- **Per-query** (covers LLM/rerank cost + margin) — metered `/v1/query` and
  `/v1/impact-analysis` calls, billed monthly, with volume tiers.
- **Governance tier** (per-seat or per-org add-on) — unlocks the audit log UI beyond a
  short retention window, exportable audit records, and (v2) policy enforcement
  (e.g., "block merge if risk level is high and no human reviewed it").

This mirrors how the product is actually built: the free/core tier is the retrieval +
impact-analysis API itself (the wedge); the governance tier monetizes the moat
(compliance data) once an org's usage is real enough to need it.

## 4. Launch plan (sequenced)

1. **Private beta** with 3-5 design partners already running agentic coding in CI —
   recruit from teams already using Cursor/Devin/Claude Code at scale, since they feel
   this pain today. Free access in exchange for structured feedback + case-study rights.
2. **Instrument the flywheel from day one**: even in beta, log every query/impact-
   analysis outcome (was it useful, did the suggested test catch the regression) — this
   data is the moat and it only exists if collection starts before "launch."
3. **Public launch**: lead with the governance/compliance angle for outbound to
   engineering leadership (the economic buyer), and the SDK/API for inbound to the
   developers who'll actually integrate it — two different messages to two different
   people in the same buying committee.
4. **Content**: publish the impact-analysis output format and a worked example (a real
   PR, its diff, and PR-Pilot's blast-radius report) — concrete and specific beats
   generic "AI safety" messaging for a technical audience.
5. **Distribution wedge**: a GitHub Action / CI template that wires
   `impactAnalysis()` into a PR check in under five minutes is the single highest-
   leverage adoption artifact — build this immediately after this MVP, before broader
   marketing.

## 5. Demo script (for investors, design partners, or a recorded walkthrough)

Shot-by-shot version with exact commands and clicks for recording this:
[`recording-script.md`](recording-script.md).

1. **Open with the pain, not the product**: "Your AI agents are already shipping PRs.
   Can you tell me, right now, what context an agent read before its last change? Most
   teams can't." (30 seconds)
2. **Register a real repo live** in the dashboard — show status go
   `PENDING → INDEXING → READY` in real time (the polling UI makes this visible without
   a page refresh).
3. **Playground**: ask a real question about that repo, show the cited answer — click
   through a citation to make the point that it's not a hallucinated reference.
4. **The actual differentiator — impact analysis**: paste a real diff from that repo
   (or generate one), run impact analysis, show the risk level + affected chunks +
   suggested tests. This is the moment that lands differently than "another RAG demo."
5. **Audit log**: show that both of the above actions are already logged with full
   citations — "this is the part that becomes non-negotiable once you have 50 agents
   running in CI, not 1."
6. **Close with the SDK**: `npm install @pr-pilot/sdk`, four lines of code, this is what
   ships inside a CI job — make it concrete that this isn't just a chat UI product.
