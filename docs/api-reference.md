# API Reference

Base URL: `NEXT_PUBLIC_API_URL` (local: `http://localhost:4000`).

Auth: every endpoint below except `/health`, `/v1/auth/register`, and `/v1/auth/login`
requires either:
- a dashboard session cookie (`pr_pilot_session`, set automatically by
  login/register), or
- an API key: `Authorization: Bearer prp_...`

Error shape (all non-2xx responses):
```json
{ "statusCode": 400, "error": "Bad Request", "message": "..." }
```

---

## Auth

### `POST /v1/auth/register`
Rate limit: 5/min. Creates an Organization + its first `OWNER` user.
```json
// Request
{ "email": "founder@acme.com", "password": "min 10 chars", "orgName": "Acme" }
// 201 Response — also sets the session cookie
{ "user": { "id": "...", "orgId": "...", "role": "OWNER", "email": "founder@acme.com" } }
```
`409` if the email is already registered.

### `POST /v1/auth/login`
Rate limit: 10/min. `200` with the same `{ user }` shape, or `401` on bad credentials.

### `POST /v1/auth/logout`
`204`. Clears the session cookie.

### `GET /v1/auth/me`
Dashboard session only (`401` for an API-key caller). Returns `{ user }`.

---

## Organizations

### `GET /v1/orgs/current`
`200`: `{ id, name, slug, createdAt }` for the caller's org.

---

## API Keys

Session-only, role-gated (`OWNER`/`ADMIN` for create/revoke; any role for list).

### `POST /v1/api-keys`
```json
// Request
{ "name": "Claude Code CI" }
// 201 — secret shown exactly once
{ "id": "...", "name": "...", "keyPrefix": "prp_ab12cd34", "secret": "prp_<full secret>", ... }
```

### `GET /v1/api-keys`
`200`: array of keys (no `secret` field — never returned again after creation).

### `DELETE /v1/api-keys/:id`
`204`. Idempotent-in-effect: sets `revokedAt`, doesn't hard-delete.

---

## Repositories

Session or API key.

### `POST /v1/repos`
```json
// Request
{ "githubUrl": "https://github.com/owner/repo", "defaultBranch": "main" }
// 201
{ "id": "...", "status": "PENDING", "chunkCount": 0, ... }
```
`400` for a non-GitHub URL. `409` if already registered for this org.

### `GET /v1/repos`
`200`: array of the org's repos.

### `GET /v1/repos/:id`
`200` or `404`.

---

## Query (primary agent-facing endpoint)

### `POST /v1/query`
Rate limit: 20/min. Session or API key.
```json
// Request
{ "repoId": "...", "question": "How does hybrid search work?", "matchCount": 20 }
// 200
{
  "answer": "It merges vector and full-text results via RRF [file.ts:10-40]...",
  "citations": [{ "chunkId": "...", "filename": "file.ts", "startLine": 10, "endLine": 40, "score": 0.83 }],
  "auditLogId": "..."
}
```
`400` if the repo isn't `READY`. `matchCount` is optional, clamped 5–50.

---

## Impact analysis

### `POST /v1/impact-analysis`
Rate limit: 20/min. Session or API key.
```json
// Request
{ "repoId": "...", "diff": "diff --git a/... unified diff text ..." }
// 200
{
  "summary": "This change touches the DB connection path used by auth.",
  "riskLevel": "medium",
  "affectedChunks": [{ "chunkId": "...", "filename": "db.ts", "startLine": 1, "endLine": 10, "reason": "...", "relatedness": 0.8 }],
  "suggestedTests": ["auth.integration.test.ts"],
  "auditLogId": "..."
}
```
`400` if the repo isn't `READY` or `diff` is under 10 characters.

---

## Audit log

### `GET /v1/audit-log?repoId=&eventType=&cursor=&limit=`
Session or API key. All query params optional; `limit` defaults to 20, max 100.
```json
{
  "items": [{ "id": "...", "eventType": "QUERY", "input": "...", "output": "...", "citations": [...], "createdAt": "..." }],
  "nextCursor": "audit_123 | null"
}
```

---

## Health

### `GET /health`
No auth. `200 { "status": "ok" }` or `503` if the database is unreachable.

---

## SDK equivalents

The `@pr-pilot/sdk` package wraps the agent-facing subset 1:1:

```ts
const client = new PrPilotClient({ apiKey: process.env.PR_PILOT_API_KEY! });
await client.query({ repoId, question });
await client.impactAnalysis({ repoId, diff });
await client.listRepos();
await client.createRepo({ githubUrl });
```
