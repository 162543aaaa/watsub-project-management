import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";
import type { Task } from "./useProjects";
import { logAudit, getCurrentUserId, taskUpdateAction } from "@/lib/auditLog";

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
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setTasks(prev => [data as Task, ...prev]);
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
    // Capture the current task for old_values
    const currentTask = tasks.find(t => t.id === id);
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTasks(prev => prev.map(t => t.id === id ? data as Task : t));
    void autoSyncToGoogleSheets("tasks", data);
    toast({ title: "อัปเดตงานสำเร็จ!" });

    const action = taskUpdateAction(currentTask?.status, updates.status);

    await logAudit({
      userId,
      action,
      entityType: "task",
      entityId: id,
      oldValues: currentTask as unknown as Record<string, unknown>,
      newValues: updates as Record<string, unknown>,
    });
    return data as Task;
  };

  const deleteTask = async (id: string) => {
    const userId = await getCurrentUserId();
    const currentTask = tasks.find(t => t.id === id);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    void autoSyncToGoogleSheets("tasks", { id }, "delete");
    setTasks(prev => prev.filter(t => t.id !== id));
    toast({ title: "ลบงานสำเร็จ!" });
    await logAudit({
      userId,
      action: "deleted",
      entityType: "task",
      entityId: id,
      oldValues: currentTask as unknown as Record<string, unknown>,
    });
  };

  // Persist reorder: assign new sort_order within the reordered group,
  // keep column-based offset so columns don't conflict
  const reorderTasks = async (reordered: Task[], colIndex: number) => {
    const withNewOrder = reordered.map((t, idx) => ({
      ...t,
      sort_order: colIndex * 10000 + idx,
    }));
    const reorderedIds = new Set(reordered.map(t => t.id));

    setTasks(prev => {
      const updated = prev.map(t => {
        const found = withNewOrder.find(r => r.id === t.id);
        return found ? found : t;
      });
      return updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    await Promise.all(
      withNewOrder
        .filter(t => reorderedIds.has(t.id))
        .map(t => supabase.from("tasks").update({ sort_order: t.sort_order }).eq("id", t.id))
    );
  };

  return { tasks, loading, addTask, updateTask, deleteTask, fetchAllTasks, refetch: fetchTasks, reorderTasks };
}
