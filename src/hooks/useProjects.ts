import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";
import { logAudit, getCurrentUserId, taskUpdateAction } from "@/lib/auditLog";

function isMissingArchivedColumnError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  return error.message.includes("is_archived") && error.message.includes("schema cache");
}

const ARCHIVED_FALLBACK_KEY = "archived_item_ids";

function readLocalArchivedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ARCHIVED_FALLBACK_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeLocalArchivedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ARCHIVED_FALLBACK_KEY, JSON.stringify(Array.from(ids)));
}

export interface Task {
  id: string;
  name: string;
  status: "To Do" | "In Progress" | "Done";
  priority: "Low" | "Medium" | "High";
  assigned_to: string[];
  due_date?: string;
  start_date?: string;
  comments?: string;
  link?: string;
  task_type: "standalone" | "project" | "customer";
  project_id?: string;
  customer_id?: string;
  created_at?: string;
  sort_order?: number;
  category?: string;
  depends_on?: string | null;
}

export type Pillar = "VIBES" | "SOUL" | "JOINT";

export interface Project {
  id: string;
  name: string;
  month: number;
  year: number;
  note?: string;
  link?: string;
  pillar: Pillar;
  is_archived?: boolean;
  created_at?: string;
  sort_order?: number;
  tasks: Task[];
}

export function useProjects(filterType: "active" | "archived" | "all" = "active") {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    // Fetch all projects then filter in JS so this works even before migration runs
    const { data: allProjData, error: projError } = await supabase
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true });
    if (projError) { console.error(projError); setLoading(false); return; }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_type", "project")
      .order("sort_order", { ascending: true });
    if (taskError) { console.error(taskError); }

    const localArchived = readLocalArchivedIds();
    const projData = (allProjData || []).filter((p) => {
      const archived = (p.is_archived ?? false) || localArchived.has(p.id);
      if (filterType === "all") return true;
      if (filterType === "archived") return archived;
      return !archived;
    });
    const projects = projData.map(p => ({
      ...p,
      pillar: p.pillar as Pillar,
      tasks: (taskData || []).filter(t => t.project_id === p.id) as Task[],
    }));
    setProjects(projects);
    setLoading(false);
  }, [filterType]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const addProject = async (proj: { name: string; month: number; year?: number; note?: string; link?: string; pillar: Pillar }) => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from("projects").insert(proj).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setProjects(prev => [...prev, { ...data, pillar: data.pillar as Pillar, tasks: [] }]);
    void autoSyncToGoogleSheets("projects", data);
    toast({ title: "สร้างโปรเจกต์สำเร็จ!" });
    await logAudit({
      userId,
      action: "created",
      entityType: "project",
      entityId: data.id,
      newValues: data as Record<string, unknown>,
    });
    return data;
  };

  const updateProject = async (id: string, updates: Partial<Omit<Project, "id" | "created_at" | "tasks">>) => {
    const userId = await getCurrentUserId();
    const current = projects.find(p => p.id === id);
    const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data, pillar: (data.pillar as Pillar) } : p));
    void autoSyncToGoogleSheets("projects", data);
    toast({ title: "อัปเดตโปรเจกต์สำเร็จ!" });
    await logAudit({
      userId,
      action: "updated",
      entityType: "project",
      entityId: id,
      oldValues: current as unknown as Record<string, unknown>,
      newValues: updates as Record<string, unknown>,
    });
  };

  const deleteProject = async (id: string) => {
    const userId = await getCurrentUserId();
    const current = projects.find(p => p.id === id);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    void autoSyncToGoogleSheets("projects", { id }, "delete");
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({ title: "ลบโปรเจกต์สำเร็จ!" });
    await logAudit({
      userId,
      action: "deleted",
      entityType: "project",
      entityId: id,
      oldValues: current as unknown as Record<string, unknown>,
    });
  };

  const archiveProject = async (id: string) => {
    const { error } = await supabase.from("projects").update({ is_archived: true }).eq("id", id);
    if (error) {
      if (isMissingArchivedColumnError(error)) {
        const archived = readLocalArchivedIds();
        archived.add(id);
        writeLocalArchivedIds(archived);
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({ title: "เก็บโปรเจกต์แล้ว!" });
  };

  const unarchiveProject = async (id: string) => {
    const { error } = await supabase.from("projects").update({ is_archived: false }).eq("id", id);
    if (error) {
      if (isMissingArchivedColumnError(error)) {
        const archived = readLocalArchivedIds();
        archived.delete(id);
        writeLocalArchivedIds(archived);
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({ title: "กู้คืนโปรเจกต์สำเร็จ!" });
  };

  const addTask = async (task: Omit<Task, "id" | "created_at">) => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setProjects(prev => prev.map(p =>
      p.id === task.project_id ? { ...p, tasks: [...p.tasks, data as Task] } : p
    ));
    void autoSyncToGoogleSheets("tasks", data);
    toast({ title: "เพิ่มงานสำเร็จ!" });
    await logAudit({
      userId,
      action: "created",
      entityType: "task",
      entityId: (data as Task).id,
      newValues: data as Record<string, unknown>,
    });
    return data;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const userId = await getCurrentUserId();
    let currentTask: Task | undefined;
    for (const p of projects) {
      const t = p.tasks.find(x => x.id === id);
      if (t) { currentTask = t; break; }
    }
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.map(p => ({
      ...p,
      tasks: p.tasks.map(t => t.id === id ? data as Task : t)
    })));
    void autoSyncToGoogleSheets("tasks", data);
    toast({ title: "อัปเดตงานสำเร็จ!" });
    await logAudit({
      userId,
      action: taskUpdateAction(currentTask?.status, updates.status),
      entityType: "task",
      entityId: id,
      oldValues: currentTask as unknown as Record<string, unknown>,
      newValues: updates as Record<string, unknown>,
    });
    return data as Task;
  };

  const deleteTask = async (id: string, projectId: string) => {
    const userId = await getCurrentUserId();
    const currentTask = projects.find(p => p.id === projectId)?.tasks.find(t => t.id === id);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    void autoSyncToGoogleSheets("tasks", { id }, "delete");
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== id) } : p
    ));
    toast({ title: "ลบงานสำเร็จ!" });
    await logAudit({
      userId,
      action: "deleted",
      entityType: "task",
      entityId: id,
      oldValues: currentTask as unknown as Record<string, unknown>,
    });
  };

  // Persist reordered projects — assigns new sort_order values and updates local state immediately
  const reorderProjects = async (reordered: Project[]) => {
    // Assign new sort_order using month-based offset so cross-month ordering is stable
    const withNewOrder = reordered.map((p, idx) => ({
      ...p,
      sort_order: p.month * 10000 + idx,
    }));
    const reorderedIds = new Set(reordered.map(p => p.id));

    // Optimistic update: replace old objects with new sort_order values in place
    setProjects(prev => {
      const updated = prev.map(p => {
        const found = withNewOrder.find(r => r.id === p.id);
        return found ? found : p;
      });
      // Keep overall list sorted by sort_order so grouping stays correct
      return updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    // Persist to DB
    await Promise.all(
      withNewOrder
        .filter(p => reorderedIds.has(p.id))
        .map(p => supabase.from("projects").update({ sort_order: p.sort_order }).eq("id", p.id))
    );
  };

  return { projects, loading, addProject, updateProject, deleteProject, archiveProject, unarchiveProject, addTask, updateTask, deleteTask, refetch: fetchProjects, reorderProjects };
}
