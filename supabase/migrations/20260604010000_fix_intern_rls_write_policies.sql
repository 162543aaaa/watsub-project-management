-- Fix intern write flows (project/customer task nesting) by splitting read vs write RLS policies.

-- Replace broad FOR ALL policies with explicit SELECT + write policies.
DROP POLICY IF EXISTS "Authenticated users can access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can access projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can access customers" ON public.customers;

-- TASKS
CREATE POLICY "Authenticated users can read tasks"
ON public.tasks FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR assigned_to && public.visible_employee_names_for_intern()
  )
);

CREATE POLICY "Authenticated users can write tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR (
      coalesce(array_length(assigned_to, 1), 0) = 0
      OR assigned_to && public.visible_employee_names_for_intern()
    )
  )
);

CREATE POLICY "Authenticated users can update tasks"
ON public.tasks FOR UPDATE
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
    OR (
      coalesce(array_length(assigned_to, 1), 0) = 0
      OR assigned_to && public.visible_employee_names_for_intern()
    )
  )
);

CREATE POLICY "Authenticated users can delete tasks"
ON public.tasks FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR assigned_to && public.visible_employee_names_for_intern()
  )
);

-- PROJECTS
CREATE POLICY "Authenticated users can read projects"
ON public.projects FOR SELECT
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
);

CREATE POLICY "Authenticated users can write projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

CREATE POLICY "Authenticated users can update projects"
ON public.projects FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = projects.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
)
WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

CREATE POLICY "Authenticated users can delete projects"
ON public.projects FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = projects.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
);

-- CUSTOMERS
CREATE POLICY "Authenticated users can read customers"
ON public.customers FOR SELECT
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
);

CREATE POLICY "Authenticated users can write customers"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

CREATE POLICY "Authenticated users can update customers"
ON public.customers FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.customer_id = customers.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
)
WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

CREATE POLICY "Authenticated users can delete customers"
ON public.customers FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND public.is_approved(auth.uid())
  AND (
    NOT public.current_user_is_intern()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.customer_id = customers.id
        AND t.assigned_to && public.visible_employee_names_for_intern()
    )
  )
);
