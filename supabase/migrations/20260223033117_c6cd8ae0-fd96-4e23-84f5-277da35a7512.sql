
-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  note TEXT,
  participants TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access meetings"
ON public.meetings FOR ALL
USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create onsite_work table
CREATE TABLE public.onsite_work (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  work_date TEXT NOT NULL,
  location TEXT,
  note TEXT,
  participants TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onsite_work ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access onsite_work"
ON public.onsite_work FOR ALL
USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

CREATE TRIGGER update_onsite_work_updated_at
BEFORE UPDATE ON public.onsite_work
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
