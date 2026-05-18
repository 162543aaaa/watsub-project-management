# Task Nesting and Card Interactivity Optimization Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Optimize the responsiveness and speed of task card interactions, status toggling, drag-and-drop operations, and project/customer card collapsing/expanding across all pages to feel instantaneous.

**Architecture:** 
1. **Optimistic UI Updates for Tasks Page:** Implement a local synchronizing state (`localTasks`) in `src/pages/Tasks.tsx` which is synchronized with hook data but updated *instantly* and *optimistically* upon drag-and-drop actions, status changes, and deletion events, while background Supabase calls run asynchronously.
2. **Stateful Expansion for Projects/Customers Page Cards:** Refactor project and customer card rendering into dedicated stateful components (`ProjectCardComponent` and `CustomerCardComponent`) to isolate expansion state, eliminating full page re-renders on simple collapse/expand clicks and making card toggle completely instant.

**Tech Stack:** React 18, @dnd-kit/core, Supabase, TypeScript

---

### Task 1: Refactor Projects Page Card Expansion to Stateful Card Component

**Files:**
- Modify: `src/pages/Projects.tsx`

**Step 1: Write a verification check**
Ensure that toggling a project card expansion renders its subtask list immediately.

**Step 2: Implement local stateful card component**
Extract the inline project card mapping in [Projects.tsx](file:///c:/Users/GONSHY1/Downloads/watsub-project-management-1/src/pages/Projects.tsx) into a local stateful `ProjectCard` component that uses:
```tsx
const [isExpanded, setIsExpanded] = useState(false);
```
Remove the global page `expanded` state from `Projects.tsx` for projects.

**Step 3: Verify build and card interactions**
Run type-checking and manual check to ensure project cards collapse and expand instantly.

**Step 4: Commit**
```bash
git add src/pages/Projects.tsx
git commit -m "refactor: optimize project card collapse/expand with local state"
```

---

### Task 2: Refactor Customers Page Card Expansion to Stateful Card Component

**Files:**
- Modify: `src/pages/Customers.tsx`

**Step 1: Write a verification check**
Ensure that toggling a customer card expansion renders its subtask list immediately.

**Step 2: Implement local stateful card component**
Extract the inline customer card mapping in [Customers.tsx](file:///c:/Users/GONSHY1/Downloads/watsub-project-management-1/src/pages/Customers.tsx) into a local stateful `CustomerCard` component that uses:
```tsx
const [isExpanded, setIsExpanded] = useState(false);
```
Remove the global page `expanded` state from `Customers.tsx` for customers.

**Step 3: Verify build and card interactions**
Run type-checking and manual check to ensure customer cards collapse and expand instantly.

**Step 4: Commit**
```bash
git add src/pages/Customers.tsx
git commit -m "refactor: optimize customer card collapse/expand with local state"
```

---

### Task 3: Implement Optimistic UI Rendering in Tasks Page

**Files:**
- Modify: `src/pages/Tasks.tsx`

**Step 1: Introduce localTasks state**
Add `localTasks` state to [Tasks.tsx](file:///c:/Users/GONSHY1/Downloads/watsub-project-management-1/src/pages/Tasks.tsx):
```tsx
const [localTasks, setLocalTasks] = useState<AllTask[]>([]);
```
Sync it with `tasks`, `projects`, and `customers` inside a `useEffect`.

**Step 2: Connect filters to localTasks**
Update the `filtered` useMemo to compute filters from `localTasks` instead of `allTasks`.

**Step 3: Optimistic Drag-and-Drop**
Modify `handleDragEnd` in `Tasks.tsx` to instantly update `localTasks` status and sort orders optimistically before triggering backend Supabase calls.

**Step 4: Optimistic Status Toggle**
Modify `handleStatusToggle` in `Tasks.tsx` to instantly update `localTasks` status when the badge is clicked.

**Step 5: Optimistic Deletion**
Modify `handleDeleteTask` in `Tasks.tsx` to instantly remove the task from `localTasks` when confirmed.

**Step 6: Verify and check**
Run `npx tsc --noEmit` and the unit test suite (`npm run test`) to ensure everything is perfectly sound.

**Step 7: Commit**
```bash
git add src/pages/Tasks.tsx
git commit -m "feat: implement optimistic UI updates for dragging, toggling, and deleting tasks"
```
