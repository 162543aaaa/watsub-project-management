# Internal PM Upgrade Plan

This is a large multi-feature request. I'll implement in scoped, reusable layers and follow existing React + Supabase patterns. Below is what I'll ship and the technical approach. Please confirm before I start.

## 1. Layered Permission Presets (Admin Panel)

- New file `src/lib/permissionPresets.ts` exporting 5 presets mapping to `allowed_pages` arrays:
  - `core_team` → tasks, projects, customers, calendar, my-work, notifications, wiki
  - `manager` → core_team + team, workload, reports, dashboard, okrs, leave, meetings, onsite-work, kpi/*
  - `finance` → budget, reports, customers, projects, export, my-work
  - `viewer` → dashboard, projects, customers, wiki (read-only intent)
  - `intern` → my-work, tasks, calendar
- AdminPanel.tsx: dropdown "Apply preset" next to each user that updates `allowed_pages`. Manual page toggles remain. Selected preset label inferred by comparing arrays.
- No DB migration; derived from `allowed_pages`.

## 2. My Work Page (`/my-work`)

- New `src/pages/MyWork.tsx`, route + sidebar entry.
- New hook `src/hooks/useMyWork.ts`:
  - Resolves current employee via `employees.email === auth user email`
  - Aggregates tasks (standalone + project + customer) where `assigned_to` includes employee name
  - Returns grouped sections: today, overdue, dueSoon (next 7d), inProgress, waitingEvidence (Done-eligible but missing link/comments per existing rule if found), recentlyCompleted (last 14d)
- Each card: source type/name, status, priority, due date, link to source page.

## 3. Done Visibility

- Already have `src/lib/taskFilters.ts` and toggles on Tasks/Projects/Customers. Extend:
  - Add optional age filter helper `filterDoneByAge(tasks, days)` 
  - Add "Auto-hide Done older than" select (Off / 7 / 14 / 30) on Tasks page only (display-only, persisted to localStorage).
- Confirm progress bars and exports keep using unfiltered lists (audit Projects/Customers/Export to ensure).

## 4. Readable Activity Log

- Existing `TaskActivityLog` is good. Improvements:
  - Add Thai labels in `parseAction` (bilingual: existing English + Thai in parens).
  - Add a `ProjectActivityLog` component (same pattern, entity_type='project') and mount it in EditProjectModal.
  - Ensure project updates write to audit_logs (add insert in `useProjects` update/create/delete paths if missing).

## 5. Task Templates

- Local-first: `src/config/taskTemplates.ts` with 5 templates listing tasks `{name, priority, dueOffsetDays, status, category, notes}`.
- New component `src/components/ApplyTemplateDialog.tsx` — choose template + start date; generates tasks under selected project_id or customer_id using existing `useTasks.addTask`.
- Add "From template" button on Projects and Customers cards/detail.
- Structure code so DB-backed templates can be added later (no migration now).

## 6. Smarter Notifications

- Schema gap: notifications has no recipient column. Add migration adding `recipient_user_id uuid` + index. Update RLS so users only see their own (admins see all). Existing rows treated as broadcast (recipient null → visible to all).
- Update `useNotifications` to filter by `recipient_user_id IS NULL OR = auth.uid()`.
- Insert notifications on:
  - Task assignment (diff in `useTasks.updateTask` assigned_to)
  - Task update to assigned users
- Dedupe: check for existing unread notification with same (recipient, type, entity ref in message) within 1h before inserting.
- Due-soon / overdue: client-side on app load — scan user's tasks, insert one-time notifications using a localStorage day-key to prevent dupes.
- Evidence reminder: when status changed to "Done" without link/comments (if that's the rule), insert reminder.

## 7. Manager Dashboard

- New page `src/pages/ManagerDashboard.tsx` at `/manager`, sidebar entry visible only to admin or users with `manager` preset.
- Sections (cards/tables, scannable):
  - Workload by employee (active task count, overdue count) — uses existing `useEmployees` + tasks
  - Overdue tasks table
  - Due-soon (next 7d) table
  - At-risk: tasks past start_date with status To Do, or due within 2d and not In Progress/Done
  - Projects/customers ≥80% complete
  - Top 5 overloaded (>N active tasks)
  - Completion rate per person / project / customer (last 30d)
- Regular users see only their own slice (filter by employee name).

## Tests

- `src/test/permissionPresets.test.ts` — preset → pages mapping + inference
- `src/test/myWorkAggregation.test.ts` — section bucketing logic from a mixed task fixture
- Extend `src/test/taskFilters.test.ts` for age filter
- Run `vitest run` and fix any test-setup issues for Supabase client.

## Migrations

1. `notifications.recipient_user_id` nullable uuid + RLS update (admins manage all, users select own/broadcast, system can insert).

## Files to change/create (summary)

- create: `src/lib/permissionPresets.ts`, `src/pages/MyWork.tsx`, `src/hooks/useMyWork.ts`, `src/pages/ManagerDashboard.tsx`, `src/config/taskTemplates.ts`, `src/components/ApplyTemplateDialog.tsx`, `src/components/ProjectActivityLog.tsx`, 3 test files, 1 migration
- edit: `src/App.tsx` (routes), `src/components/AppSidebar.tsx` (nav items), `src/pages/AdminPanel.tsx` (preset UI), `src/pages/Tasks.tsx` (age filter), `src/lib/taskFilters.ts` (age helper), `src/components/TaskActivityLog.tsx` (Thai labels), `src/components/EditProjectModal.tsx` (mount log), `src/hooks/useNotifications.ts` (recipient filter + dedupe helper), `src/hooks/useTasks.ts` (notify on assignment), `src/hooks/useProjects.ts` (audit insert)

## What I'm NOT doing (out of scope)

- No refactor of existing modules unrelated to these features.
- No removal of existing pages, fields, or behavior.
- No archive system (kept separate from hide per request).

Approve and I'll execute end-to-end, then summarize results.