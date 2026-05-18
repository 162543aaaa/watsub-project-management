# User Deletion and Intern Preset Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fix the user deletion failure by adding ON DELETE CASCADE to the notifications table foreign key constraint and ensure complete cleanup in the Edge Function, and create/update the Intern permission preset to grant proper access to the dashboard, tasks, my work, projects, customers, calendar, and notifications.

**Architecture:** 
1. Database migration: Drop the existing `notifications_recipient_user_id_fkey` constraint and recreate it with `ON DELETE CASCADE` referencing `auth.users(id)`.
2. Edge Function update: Update `admin-users` Edge Function (`supabase/functions/admin-users/index.ts`) to proactively delete notification logs and employee profiles for the deleted user before calling the Admin Delete API.
3. Frontend update: Modify `src/lib/permissionPresets.ts` to update the `intern` preset allowed pages to `["/", "/my-work", "/tasks", "/projects", "/customers", "/calendar", "/notifications"]` ensuring perfect UI alignment with their database RLS policies.

**Tech Stack:** Supabase Migrations, TypeScript, React, Vite.

---

### Task 1: Database Migration for Notifications FK Cascade

**Files:**
- Create: `supabase/migrations/20260604060000_fix_notifications_fk_cascade.sql`

**Step 1: Write the migration SQL**
Write SQL to drop the default foreign key constraint on the `notifications` table and replace it with a cascade constraint.

```sql
-- Migration: Add ON DELETE CASCADE to notifications.recipient_user_id foreign key constraint.
-- This ensures deleting a user from auth.users automatically deletes all their notifications,
-- preventing foreign key violation errors during user deletion.

ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_recipient_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_recipient_user_id_fkey 
  FOREIGN KEY (recipient_user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
```

**Step 2: Commit migration**
```bash
git add supabase/migrations/20260604060000_fix_notifications_fk_cascade.sql
git commit -m "migration: cascade delete notifications when recipient user is deleted"
```

---

### Task 2: Harden Edge Function User Deletion

**Files:**
- Modify: `supabase/functions/admin-users/index.ts:109-125`

**Step 1: Write the hardened deletion block in the Deno Edge Function**
Proactively clean up all dependent tables (including `notifications` and `employees`) in the Edge Function before deleting the authentication record, ensuring high robustness.

```typescript
    if (action === 'delete-user') {
      // 1. Delete notifications for this user explicitly
      await supabase.from('notifications').delete().eq('recipient_user_id', user_id);
      
      // 2. Delete user roles
      await supabase.from('user_roles').delete().eq('user_id', user_id);
      
      // 3. Delete employee record (which cascades to other kpi and objective tables)
      await supabase.from('employees').delete().eq('user_id', user_id);
      
      // 4. Delete profile
      await supabase.from('profiles').delete().eq('user_id', user_id);
      
      // 5. Delete auth user via Admin API
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
```

**Step 2: Commit changes**
```bash
git add supabase/functions/admin-users/index.ts
git commit -m "feat: harden Edge Function user deletion sequence"
```

---

### Task 3: Overhaul Intern Permission Preset

**Files:**
- Modify: `src/lib/permissionPresets.ts:66-72`

**Step 1: Update the Intern preset in `src/lib/permissionPresets.ts`**
Update the list of allowed pages for interns to include the dashboard (`/`), tasks (`/tasks`), my work (`/my-work`), projects (`/projects`), customers (`/customers`), calendar (`/calendar`), and notifications (`/notifications`).

```typescript
  {
    key: "intern",
    label: "Intern",
    description: "Limited access for interns",
    pages: [
      "/", "/my-work", "/tasks", "/projects", "/customers", "/calendar",
      "/notifications"
    ],
  },
```

**Step 2: Verify the build**
Run typecheck and production build to ensure 100% successful compilation.
```bash
npx tsc --noEmit
npm run build
```

**Step 3: Commit changes**
```bash
git add src/lib/permissionPresets.ts
git commit -m "feat: update intern permission preset allowed pages"
```
