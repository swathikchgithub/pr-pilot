# ERD / Data Model

Source of truth: `packages/db/prisma/schema.prisma`. This doc is a human-readable view.

```mermaid
erDiagram
  Organization ||--o{ User : has
  Organization ||--o{ ApiKey : has
  Organization ||--o{ Repo : has
  Organization ||--o{ AuditLogEntry : has
  Repo ||--o{ CodeChunk : contains
  Repo ||--o{ AuditLogEntry : "scoped by"
  User ||--o{ AuditLogEntry : "may have created"
  ApiKey ||--o{ AuditLogEntry : "may have created"

  Organization {
    string id PK
    string name
    string slug UK
    datetime createdAt
  }
  User {
    string id PK
    string email UK
    string passwordHash
    enum role "OWNER | ADMIN | MEMBER"
    string orgId FK
    datetime createdAt
  }
  ApiKey {
    string id PK
    string orgId FK
    string name
    string keyPrefix "display only"
    string keyHash UK "sha256(secret + pepper)"
    datetime createdAt
    datetime lastUsedAt
    datetime revokedAt
  }
  Repo {
    string id PK
    string orgId FK
    string githubUrl
    string defaultBranch
    enum status "PENDING | INDEXING | READY | FAILED"
    int chunkCount
    datetime lastIndexedAt
    string lastError
    datetime createdAt
  }
  CodeChunk {
    string id PK
    string repoId FK
    string filename
    int startLine
    int endLine
    string content
    string symbolKind "function|class|method|window"
    string symbolName
    vector embedding "vector(768), raw SQL only"
    tsvector fts_tokens "generated column"
    datetime createdAt
  }
  AuditLogEntry {
    string id PK
    string orgId FK
    string repoId FK
    string apiKeyId FK "nullable"
    string userId FK "nullable"
    enum eventType "QUERY | IMPACT_ANALYSIS"
    string input
    string output
    json citations
    datetime createdAt
  }
```

## Notes

- All primary keys are `cuid()` strings, not database-native UUIDs — no `uuid`
  extension dependency, and IDs are generated in application code (Prisma) except for
  `CodeChunk` rows, which the worker inserts via raw SQL and IDs with
  `crypto.randomUUID()` (see `apps/worker/src/ingest/persist-chunks.ts`) since that path
  bypasses Prisma's normal `create()`.
- `Repo.githubUrl` is unique **per org** (`@@unique([orgId, githubUrl])`), not globally
  — two different orgs can both index the same public repo independently.
- `AuditLogEntry.apiKeyId` and `.userId` are both nullable and mutually informative:
  exactly one is set per row, indicating whether the action was taken by a dashboard
  user or an agent/CI API key. Both use `onDelete: SetNull` so deleting a user or
  revoking a key never deletes its audit history.
- `CodeChunk.embedding` and `.fts_tokens` are the only columns not managed through
  Prisma Client's normal query API — see ADR 0003.
- Indexes: `hnsw` on `embedding` (approximate vector search), `gin` on `fts_tokens`
  (full-text), plus standard btree indexes on every foreign key and on
  `AuditLogEntry(orgId, createdAt)` for the paginated audit log query.
