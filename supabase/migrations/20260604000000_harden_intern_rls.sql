-- Intern role hardening: enforce visibility at RLS layer using employees.role

-- Helper: resolve current employee from auth.uid() by matching auth email -> employees.email
CREATE OR REPLACE FUNCTION public.current_employee()
RETURNS public.employees
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.*
  FROM public.employees e
  JOIN auth.users u ON lower(u.email) = lower(e.email)
  WHERE u.id = auth.uid()
  ORDER BY e.created_at ASC
  LIMIT 1;
$$;

-- Helper: true when current user is an intern
CREATE OR REPLACE FUNCTION public.current_user_is_intern()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT lower(e.role) = 'intern' FROM public.current_employee() e), false);
$$;

-- Helper: employee names visible to an intern (self + all interns)
CREATE OR REPLACE FUNCTION public.visible_employee_names_for_intern()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT name), '{}'::text[])
  FROM (
    SELECT e.name
    FROM public.employees e
    WHERE lower(e.role) = 'intern'

    UNION

    SELECT me.name
    FROM public.current_employee() me
  ) s;
$$;

-- Clean existing broad/legacy policies for target tables
DROP POLICY IF EXISTS "Allow all operations on employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can access employees" ON public.employees;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can access projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can access customers" ON public.customers;

-- Employees: non-interns can see/manage all, interns can see only interns + self
CREATE POLICY "Authenticated users can access employees"
ON public.employees FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR lower(role) = 'intern'
    OR email = (SELECT email FROM public.current_employee())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR lower(role) = 'intern'
    OR email = (SELECT email FROM public.current_employee())
  )
);

-- Tasks: non-interns all tasks, interns only tasks assigned to visible intern names
CREATE POLICY "Authenticated users can access tasks"
ON public.tasks FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR assigned_to && public.visible_employee_names_for_intern()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR assigned_to && public.visible_employee_names_for_intern()
  )
);

-- Projects: interns only see/manage projects with at least one visible task
CREATE POLICY "Authenticated users can access projects"
ON public.projects FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.project_id = projects.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.project_id = projects.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
);

-- Customers: interns only see/manage customers with at least one visible task
CREATE POLICY "Authenticated users can access customers"
ON public.customers FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.customer_id = customers.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.customer_id = customers.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
);
