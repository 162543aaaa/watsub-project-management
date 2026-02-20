
-- =====================================================
-- PROJECT HUB - Full Database Schema
-- =====================================================

-- EMPLOYEES TABLE
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee',
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- PROJECTS TABLE
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  month INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

-- TASKS TABLE (standalone + project tasks + customer tasks)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Done')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  assigned_to TEXT[] NOT NULL DEFAULT '{}',
  due_date TEXT,
  start_date TEXT,
  comments TEXT,
  link TEXT,
  task_type TEXT NOT NULL DEFAULT 'standalone' CHECK (task_type IN ('standalone', 'project', 'customer')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_customer_id ON public.tasks(customer_id);
CREATE INDEX idx_tasks_task_type ON public.tasks(task_type);

-- CUSTOMERS TABLE
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  detail TEXT,
  payment_fee TEXT,
  project_title TEXT,
  note TEXT,
  month INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Add foreign key for customer_id in tasks after customers table is created
ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

-- GOALS TABLE
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'team' CHECK (type IN ('individual', 'team')),
  target_value NUMERIC NOT NULL DEFAULT 100,
  current_value NUMERIC NOT NULL DEFAULT 0,
  deadline TEXT NOT NULL,
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);

-- LEAVE REQUESTS TABLE
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by TEXT NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'Annual',
  leave_start TEXT NOT NULL,
  leave_end TEXT NOT NULL,
  leave_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  requested_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on leave_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);

-- NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('success', 'error', 'info')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
