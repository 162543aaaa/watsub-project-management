-- Helper: get current employee id by matching auth user email to employees.email
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  JOIN auth.users u ON lower(u.email) = lower(e.email)
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- Helper: get current employee name
CREATE OR REPLACE FUNCTION public.current_employee_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.name
  FROM public.employees e
  JOIN auth.users u ON lower(u.email) = lower(e.email)
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- Helper: is the given auth user an intern?
CREATE OR REPLACE FUNCTION public.is_intern(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN auth.users u ON lower(u.email) = lower(e.email)
    WHERE u.id = _user_id AND e.role = 'intern'
  );
$$;

-- Helper: list of employee names visible to an intern (self + all interns)
CREATE OR REPLACE FUNCTION public.intern_visible_names()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT name), ARRAY[]::text[])
  FROM public.employees
  WHERE role = 'intern' OR name = public.current_employee_name();
$$;

-- Replace employees policy
DROP POLICY IF EXISTS "Authenticated users can access employees" ON public.employees;
CREATE POLICY "Authenticated users can access employees"
ON public.employees
FOR ALL
TO public
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.is_intern(auth.uid())
    OR role = 'intern'
    OR id = public.current_employee_id()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.is_intern(auth.uid())
    OR id = public.current_employee_id()
  )
);

-- Replace tasks policy
DROP POLICY IF EXISTS "Authenticated users can access tasks" ON public.tasks;
CREATE POLICY "Authenticated users can access tasks"
ON public.tasks
FOR ALL
TO public
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.is_intern(auth.uid())
    OR assigned_to && public.intern_visible_names()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.is_intern(auth.uid())
    OR assigned_to && public.intern_visible_names()
  )
);

-- Replace projects policy: interns only see projects with at least one visible task
DROP POLICY IF EXISTS "Authenticated users can access projects" ON public.projects;
CREATE POLICY "Authenticated users can access projects"
ON public.projects
FOR ALL
TO public
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.is_intern(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = projects.id
        AND t.assigned_to && public.intern_visible_names()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND NOT public.is_intern(auth.uid())
);

-- Replace customers policy
DROP POLICY IF EXISTS "Authenticated users can access customers" ON public.customers;
CREATE POLICY "Authenticated users can access customers"
ON public.customers
FOR ALL
TO public
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.is_intern(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.customer_id = customers.id
        AND t.assigned_to && public.intern_visible_names()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND NOT public.is_intern(auth.uid())
);