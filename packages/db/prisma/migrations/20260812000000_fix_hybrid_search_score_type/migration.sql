-- Fix match_code_chunks_hybrid: the RRF score expression (1.0 / bigint arithmetic)
-- evaluates to numeric, but the function declares `score float`. PL/pgSQL's
-- RETURN QUERY does not implicitly cast numeric -> float for a RETURNS TABLE
-- column, causing "structure of query does not match function result type"
-- at call time. Cast the expression explicitly.
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
    (COALESCE(1.0 / (rrf_k + vm.rank), 0.0) + COALESCE(1.0 / (rrf_k + fm.rank), 0.0))::float AS score
  FROM code_chunks c
  LEFT JOIN vector_matches vm ON c.id = vm.id
  LEFT JOIN fts_matches fm ON c.id = fm.id
  WHERE vm.id IS NOT NULL OR fm.id IS NOT NULL
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
