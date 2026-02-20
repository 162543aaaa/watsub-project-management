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
}

export interface Project {
  id: string;
  name: string;
  month: number;
  note?: string;
  created_at?: string;
  tasks: Task[];
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    const { data: projData, error: projError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    if (projError) { console.error(projError); setLoading(false); return; }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_type", "project")
      .order("created_at", { ascending: true });
    if (taskError) { console.error(taskError); }

    const projects = (projData || []).map(p => ({
      ...p,
      tasks: (taskData || []).filter(t => t.project_id === p.id) as Task[],
    }));
    setProjects(projects);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const addProject = async (proj: { name: string; month: number; note?: string }) => {
    const { data, error } = await supabase.from("projects").insert(proj).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setProjects(prev => [...prev, { ...data, tasks: [] }]);
    toast({ title: "สร้างโปรเจกต์สำเร็จ!" });
    return data;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({ title: "ลบโปรเจกต์สำเร็จ!" });
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

  return { projects, loading, addProject, deleteProject, addTask, updateTask, deleteTask, refetch: fetchProjects };
}
