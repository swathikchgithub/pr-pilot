# PR-Pilot

**The context and impact-analysis layer for AI coding agents.**

AI coding agents (Claude Code, Cursor agents, Devin, in-house agents wired into CI) are
shipping PRs faster than engineering orgs can govern them. PR-Pilot gives those agents
and CI pipelines grounded, cited retrieval over a codebase and pre-merge blast-radius
analysis on any diff — plus a full audit trail of every query and citation, for the
compliance review every org adopting agentic coding eventually needs.

The dashboard is a secondary, human-facing surface over the same API — the API and
`@pr-pilot/sdk` are the product's primary interface.

## Documentation

- **[Getting started](docs/getting-started.md)** — what PR-Pilot is, who it's for, architecture at a glance
- **[Quickstart](docs/quickstart.md)** — local setup, example queries, running tests, using the SDK
- **[API reference](docs/api-reference.md)** — every endpoint, request/response shapes, SDK equivalents

Full product/strategy context: [`docs/prd.md`](docs/prd.md) ·
[`docs/go-to-market.md`](docs/go-to-market.md).

## Repository layout

Folder-by-folder explanation and where to start reading for common tasks:
[`docs/code-walkthrough.md`](docs/code-walkthrough.md).

## Security

Auth model, injection/prompt-injection defenses, and known gaps:
[`docs/security.md`](docs/security.md).

## License

MIT — see [`LICENSE`](LICENSE).
