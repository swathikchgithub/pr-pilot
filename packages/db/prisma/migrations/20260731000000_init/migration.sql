-- PR-Pilot initial schema
-- Enable pgvector (Google text-embedding-004 = 768 dims)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enums --------------------------------------------------------------------
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "RepoStatus" AS ENUM ('PENDING', 'INDEXING', 'READY', 'FAILED');
CREATE TYPE "AuditEventType" AS ENUM ('QUERY', 'IMPACT_ANALYSIS');

-- organizations --------------------------------------------------------------
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- users ------------------------------------------------------------------
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'OWNER',
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_org_id_idx" ON "users"("org_id");
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- api_keys -----------------------------------------------------------------
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_org_id_idx" ON "api_keys"("org_id");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- repos ----------------------------------------------------------------------
CREATE TABLE "repos" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "github_url" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "status" "RepoStatus" NOT NULL DEFAULT 'PENDING',
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "last_indexed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "repos_org_id_github_url_key" ON "repos"("org_id", "github_url");
CREATE INDEX "repos_org_id_idx" ON "repos"("org_id");
ALTER TABLE "repos" ADD CONSTRAINT "repos_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- code_chunks ------------------------------------------------------------
CREATE TABLE "code_chunks" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "start_line" INTEGER NOT NULL,
    "end_line" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "symbol_kind" TEXT,
    "symbol_name" TEXT,
    "embedding" vector(768),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "code_chunks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "code_chunks_repo_id_idx" ON "code_chunks"("repo_id");
ALTER TABLE "code_chunks" ADD CONSTRAINT "code_chunks_repo_id_fkey"
    FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Full-text search column + indexes (kept from the v0 hybrid-search design)
ALTER TABLE "code_chunks"
    ADD COLUMN "fts_tokens" tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', "filename" || ' ' || "content")) STORED;

CREATE INDEX "code_chunks_embedding_hnsw_idx"
    ON "code_chunks" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "code_chunks_fts_idx"
    ON "code_chunks" USING gin ("fts_tokens");

-- audit_log_entries --------------------------------------------------------
CREATE TABLE "audit_log_entries" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "user_id" TEXT,
    "event_type" "AuditEventType" NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_log_entries_org_id_created_at_idx" ON "audit_log_entries"("org_id", "created_at");
CREATE INDEX "audit_log_entries_repo_id_idx" ON "audit_log_entries"("repo_id");
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_repo_id_fkey"
    FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_api_key_id_fkey"
    FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hybrid search RPC: vector similarity + full-text, merged with Reciprocal Rank Fusion
CREATE OR REPLACE FUNCTION match_code_chunks_hybrid (
  filter_repo_id text,
  query_text text,
  query_embedding vector(768),
  match_count int DEFAULT 20,
  rrf_k int DEFAULT 60
)
RETURNS TABLE (
  id text,
  filename text,
  start_line int,
  end_line int,
  content text,
  symbol_kind text,
  symbol_name text,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH
  vector_matches AS (
    SELECT c.id, row_number() OVER (ORDER BY c.embedding <=> query_embedding) AS rank
    FROM code_chunks c
    WHERE c.repo_id = filter_repo_id
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fts_matches AS (
    SELECT c.id, row_number() OVER (
      ORDER BY ts_rank_cd(c.fts_tokens, websearch_to_tsquery('simple', query_text)) DESC
    ) AS rank
    FROM code_chunks c
    WHERE c.repo_id = filter_repo_id
      AND c.fts_tokens @@ websearch_to_tsquery('simple', query_text)
    ORDER BY ts_rank_cd(c.fts_tokens, websearch_to_tsquery('simple', query_text)) DESC
    LIMIT match_count * 2
  )
  SELECT
    c.id, c.filename, c.start_line, c.end_line, c.content, c.symbol_kind, c.symbol_name,
    COALESCE(1.0 / (rrf_k + vm.rank), 0.0) + COALESCE(1.0 / (rrf_k + fm.rank), 0.0) AS score
  FROM code_chunks c
  LEFT JOIN vector_matches vm ON c.id = vm.id
  LEFT JOIN fts_matches fm ON c.id = fm.id
  WHERE vm.id IS NOT NULL OR fm.id IS NOT NULL
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
