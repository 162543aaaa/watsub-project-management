-- Migration: Add intern role column if missing and RLS policies for interns
-- Add role column (if not exists)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS role VARCHAR;

-- Ensure role can hold 'intern'
-- No enum needed; free text.

-- RLS policy for employees: interns can only see other interns
DROP POLICY IF EXISTS "Authenticated users can access employees" ON public.employees;
CREATE POLICY "Authenticated users can access employees"
  ON public.employees
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid()) AND (
      (SELECT e.role FROM public.employees e WHERE e.user_id = auth.uid()) <> 'intern'
      OR role = 'intern'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid())
  );

-- RLS policy for tasks: interns see tasks assigned to themselves or other interns
DROP POLICY IF EXISTS "Authenticated users can access tasks" ON public.tasks;
CREATE POLICY "Authenticated users can access tasks"
  ON public.tasks
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid()) AND (
      (SELECT e.role FROM public.employees e WHERE e.user_id = auth.uid()) <> 'intern'
      OR assigned_to && (SELECT array_agg(name) FROM public.employees WHERE role = 'intern')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid())
  );

-- RLS policy for projects: interns see projects that have at least one visible task
DROP POLICY IF EXISTS "Authenticated users can access projects" ON public.projects;
CREATE POLICY "Authenticated users can access projects"
  ON public.projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid()) AND (
      (SELECT e.role FROM public.employees e WHERE e.user_id = auth.uid()) <> 'intern'
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.project_id = projects.id
          AND (
            (SELECT e.role FROM public.employees e WHERE e.user_id = auth.uid()) <> 'intern'
            OR t.assigned_to && (SELECT array_agg(name) FROM public.employees WHERE role = 'intern')
          )
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid())
  );

-- RLS policy for customers: similar to projects
DROP POLICY IF EXISTS "Authenticated users can access customers" ON public.customers;
CREATE POLICY "Authenticated users can access customers"
  ON public.customers
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid()) AND (
      (SELECT e.role FROM public.employees e WHERE e.user_id = auth.uid()) <> 'intern'
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.customer_id = customers.id
          AND (
            (SELECT e.role FROM public.employees e WHERE e.user_id = auth.uid()) <> 'intern'
            OR t.assigned_to && (SELECT array_agg(name) FROM public.employees WHERE role = 'intern')
          )
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved(auth.uid())
  );
