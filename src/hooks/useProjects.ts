import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

export function useProjects(showArchived = false) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    const { data: projData, error: projError } = await supabase
      .from("projects")
      .select("*")
      .eq("is_archived", showArchived)
      .order("sort_order", { ascending: true });
    if (projError) { console.error(projError); setLoading(false); return; }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_type", "project")
      .order("sort_order", { ascending: true });
    if (taskError) { console.error(taskError); }

    const projects = (projData || []).map(p => ({
      ...p,
      pillar: p.pillar as Pillar,
      tasks: (taskData || []).filter(t => t.project_id === p.id) as Task[],
    }));
    setProjects(projects);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchProjects(); }, [showArchived]);

  const addProject = async (proj: { name: string; month: number; year?: number; note?: string; link?: string; pillar: Pillar }) => {
    const { data, error } = await supabase.from("projects").insert(proj).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setProjects(prev => [...prev, { ...data, pillar: data.pillar as Pillar, tasks: [] }]);
    toast({ title: "สร้างโปรเจกต์สำเร็จ!" });
    return data;
  };

  const updateProject = async (id: string, updates: Partial<Omit<Project, "id" | "created_at" | "tasks">>) => {
    const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data, pillar: (data.pillar as Pillar) } : p));
    toast({ title: "อัปเดตโปรเจกต์สำเร็จ!" });
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({ title: "ลบโปรเจกต์สำเร็จ!" });
  };

  const archiveProject = async (id: string) => {
    const { error } = await supabase.from("projects").update({ is_archived: true }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({ title: "เก็บโปรเจกต์แล้ว!" });
  };

  const unarchiveProject = async (id: string) => {
    const { error } = await supabase.from("projects").update({ is_archived: false }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({ title: "กู้คืนโปรเจกต์สำเร็จ!" });
  };

  const addTask = async (task: Omit<Task, "id" | "created_at">) => {
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setProjects(prev => prev.map(p =>
      p.id === task.project_id ? { ...p, tasks: [...p.tasks, data as Task] } : p
    ));
    toast({ title: "เพิ่มงานสำเร็จ!" });
    return data;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.map(p => ({
      ...p,
      tasks: p.tasks.map(t => t.id === id ? data as Task : t)
    })));
    toast({ title: "อัปเดตงานสำเร็จ!" });
  };

  const deleteTask = async (id: string, projectId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== id) } : p
    ));
    toast({ title: "ลบงานสำเร็จ!" });
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
