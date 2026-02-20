import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Task } from "./useProjects";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_type", "standalone")
      .order("sort_order", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    setTasks((data || []) as Task[]);
    setLoading(false);
  };

  const fetchAllTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) { console.error(error); return []; }
    return (data || []) as Task[];
  };

  useEffect(() => { fetchTasks(); }, []);

  const addTask = async (task: Omit<Task, "id" | "created_at">) => {
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setTasks(prev => [data as Task, ...prev]);
    toast({ title: "เพิ่มงานสำเร็จ!" });
    return data;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTasks(prev => prev.map(t => t.id === id ? data as Task : t));
    toast({ title: "อัปเดตงานสำเร็จ!" });
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
    toast({ title: "ลบงานสำเร็จ!" });
  };

  // Persist reorder for standalone tasks (by column)
  const reorderTasks = async (reordered: Task[]) => {
    setTasks(prev => {
      const others = prev.filter(t => !reordered.find(r => r.id === t.id));
      return [...reordered, ...others];
    });
    const updates = reordered.map((t, idx) => supabase.from("tasks").update({ sort_order: idx + 1 }).eq("id", t.id));
    await Promise.all(updates);
  };

  return { tasks, loading, addTask, updateTask, deleteTask, fetchAllTasks, refetch: fetchTasks, reorderTasks };
}
