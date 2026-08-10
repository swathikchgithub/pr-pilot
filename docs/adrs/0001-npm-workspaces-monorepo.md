# ADR 0001: npm workspaces monorepo, not Turborepo/Nx

## Status
Accepted

## Context
The product needs three deployable units (web dashboard, API, ingestion worker) plus
shared code (types, DB schema, UI kit, agent SDK). We need a repo structure that keeps
them consistent without introducing more build tooling than the project's size justifies.

## Decision
Use plain **npm workspaces** (`apps/*`, `packages/*`) with no Turborepo/Nx layer.
Each app/package has its own `build`/`test`/`typecheck` script; the root `package.json`
fans out to all workspaces with `--workspaces --if-present`.

## Consequences
- No remote build cache, no task-graph pruning — acceptable at this scale (5 packages,
  3 apps). Revisit if CI build time becomes a problem as the codebase grows.
- Cross-package imports (`@pr-pilot/types`, `@pr-pilot/db`, `@pr-pilot/ui`) resolve via
  workspace symlinks with zero extra config.
- Simpler onboarding: `npm install` at the root is the only setup step for the whole repo.
