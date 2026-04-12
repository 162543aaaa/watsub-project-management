-- ============================================================================
-- RAG / pgvector: enable extension, add embedding column, create search index
-- and match_tasks() function
-- ============================================================================

-- 1. Enable pgvector (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add 768-dim embedding column to tasks
--    (text-embedding-004 from Google returns 768-dimensional vectors)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. HNSW index — cosine distance, best for semantic similarity workloads
--    (requires pgvector >= 0.5.0, which Supabase ships by default)
--    Built lazily: safe to create on an empty column, rows are indexed as
--    embeddings are written by the generate-embedding edge function.
CREATE INDEX IF NOT EXISTS idx_tasks_embedding_hnsw
  ON public.tasks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. match_tasks() — semantic search scoped to a single caller
--    Parameters:
--      query_embedding  : 768-dim vector of the user's question
--      match_threshold  : minimum cosine similarity (0–1), e.g. 0.3
--      match_count      : max rows to return, e.g. 5
--      caller_id        : auth.uid() of the requester
--
--    Security note: assigned_to is TEXT[], caller_id is UUID.
--    We cast caller_id to text so the array containment check works.
--    The function is SECURITY DEFINER so it can be called by the service-role
--    client inside the edge function without needing RLS to be disabled.

CREATE OR REPLACE FUNCTION public.match_tasks(
  query_embedding vector(768),
  match_threshold float,
  match_count      int,
  caller_id        uuid
)
RETURNS TABLE (
  id         uuid,
  name       text,
  status     text,
  priority   text,
  due_date   text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.status,
    t.priority,
    t.due_date,
    (1 - (t.embedding <=> query_embedding))::float AS similarity
  FROM public.tasks t
  WHERE
    -- only rows that have been embedded
    t.embedding IS NOT NULL
    -- scoped to the caller's own tasks (TEXT[] containment, UUID cast to text)
    AND t.assigned_to @> ARRAY[caller_id::text]
    -- cosine similarity threshold (1 = identical, 0 = orthogonal)
    AND (1 - (t.embedding <=> query_embedding)) >= match_threshold
  ORDER BY t.embedding <=> query_embedding   -- ascending distance = descending similarity
  LIMIT match_count;
$$;

-- Grant execute to authenticated users (edge function calls as service role,
-- but granting to authenticated keeps it usable from client-side RPC too)
GRANT EXECUTE ON FUNCTION public.match_tasks(vector, float, int, uuid)
  TO authenticated, service_role;
