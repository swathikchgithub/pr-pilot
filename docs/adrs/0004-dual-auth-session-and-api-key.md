# ADR 0004: One guard, two credential types (session cookie + API key)

## Status
Accepted

## Context
PR-Pilot has two categories of caller: humans in the dashboard (login/register flow)
and AI agents/CI pipelines calling `/v1/query` and `/v1/impact-analysis` directly. Both
need org-scoped access to the same underlying resources (repos, audit log). Building
two parallel authorization systems would duplicate every controller's access checks.

## Decision
A single `OrgAuthGuard` accepts **either** credential:
1. An httpOnly session cookie (`pr_pilot_session`, a signed JWT) — dashboard users.
2. A `Bearer prp_...` API key — agents/CI, validated against a salted+peppered hash
   stored in Postgres (`ApiKeyAuthService`).

Both paths normalize into the same `OrgContext` (`{ orgId, userId, apiKeyId, role }`)
that every controller reads via `@CurrentOrgContext()`. Role-gated routes (API key
management, in `ApiKeysController`) use a separate `RolesGuard` that only recognizes
the session path — API keys can query/analyze but can never manage other API keys or
org settings (least privilege).

## Consequences
- The **Playground** in the dashboard calls the exact same `/v1/query` endpoint agents
  use, authenticated via cookie instead of API key — one code path, not two.
- API keys are hashed with a keyed SHA-256 (secret + server-side pepper) and looked up
  by an indexed equality match on the hash, not a prefix scan — O(1) lookup instead of
  bcrypt-per-row, appropriate because the secret itself already has 256 bits of entropy.
- A NestJS gotcha surfaced while building this: a guard applied via `@UseGuards()` in a
  *different* module than the one that declares it has its own constructor dependencies
  resolved against the *consuming* module's visible providers, not the declaring
  module's. `AuthCommonModule` must re-export `ApiKeyAuthModule` (not just the guard
  classes) for every module that uses `OrgAuthGuard`. This was caught by the `test/`
  e2e suite booting the real `AuthModule`, not by unit tests alone.
