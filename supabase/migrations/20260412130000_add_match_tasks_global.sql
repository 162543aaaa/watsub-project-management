-- ============================================================================
-- RAG Phase 3: unscoped match_tasks_global for Edge Function service-role use
-- Used by ai-phase3-advanced/onboard-project to find semantically similar
-- tasks without filtering by caller_id (since assigned_to stores names, not UUIDs)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_tasks_global(
  query_embedding  vector(768),
  match_threshold  float,
  match_count      int
)
RETURNS TABLE (
  id         uuid,
  name       text,
  status     text,
  priority   text,
  due_date   text,
  comments   text,
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
    t.comments,
    (1 - (t.embedding <=> query_embedding))::float AS similarity
  FROM public.tasks t
  WHERE
    t.embedding IS NOT NULL
    AND (1 - (t.embedding <=> query_embedding)) >= match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant execute: edge function calls as service_role; also allow authenticated
-- for any future client-side semantic search use-cases
GRANT EXECUTE ON FUNCTION public.match_tasks_global(vector, float, int)
  TO authenticated, service_role;

-- ============================================================================
-- Also add embedding column to projects table (for future project-level RAG)
-- ============================================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_projects_embedding_hnsw
  ON public.projects
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
