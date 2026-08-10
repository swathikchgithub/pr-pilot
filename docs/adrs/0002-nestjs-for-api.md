# ADR 0002: NestJS for the API, not Next.js API routes

## Status
Accepted

## Context
PR-Pilot's primary product surface is now an API consumed by AI coding agents and CI
pipelines (see PRD), not a human-facing web app. That surface needs: dual auth (session
cookies for the dashboard, API keys for agents), org-scoped authorization, rate limiting,
background job coordination (BullMQ), and a real service boundary that can scale and
deploy independently of the web app.

## Decision
Build `apps/api` as a standalone **NestJS** service, deployed separately from
`apps/web` (Next.js). Next.js API routes were considered and rejected for this role.

## Consequences
- Clear separation of concerns (Section 6 of the engineering guidelines): the web app
  is presentation-only; all business logic, auth, and data access live in the API.
- NestJS's DI, guards, and module system give us composable auth (`OrgAuthGuard`,
  `RolesGuard`) shared cleanly across every feature module — see ADR 0004.
- Cost: two services to deploy/monitor instead of one. Justified because the API is the
  product's real interface (agents/CI call it directly via `@pr-pilot/sdk`), independent
  of whether the dashboard exists at all.
