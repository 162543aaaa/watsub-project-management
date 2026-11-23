-- Infinite whiteboards (Excalidraw scenes) shared by approved team members.

CREATE TABLE public.whiteboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,64}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.whiteboard_files (
  board_id uuid NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  file_id text NOT NULL CHECK (char_length(file_id) BETWEEN 1 AND 128),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml')),
  data_url text NOT NULL CHECK (char_length(data_url) <= 8000000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, file_id)
);

ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboard_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view whiteboards" ON public.whiteboards
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Approved users can create whiteboards" ON public.whiteboards
  FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "Approved users can edit whiteboards" ON public.whiteboards
  FOR UPDATE TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can view whiteboard files" ON public.whiteboard_files
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Approved users can add whiteboard files" ON public.whiteboard_files
  FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_whiteboard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER whiteboards_touch BEFORE UPDATE ON public.whiteboards
  FOR EACH ROW EXECUTE FUNCTION public.touch_whiteboard();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whiteboards;
