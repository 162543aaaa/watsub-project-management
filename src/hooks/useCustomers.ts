import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Task } from "./useProjects";

export interface Customer {
  id: string;
  name: string;
  detail?: string;
  payment_fee?: string;
  project_title?: string;
  note?: string;
  month: number;
  created_at?: string;
  sort_order?: number;
  tasks: Task[];
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    const { data: custData, error: custError } = await supabase
      .from("customers")
      .select("*")
      .order("sort_order", { ascending: true });
    if (custError) { console.error(custError); setLoading(false); return; }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_type", "customer")
      .order("sort_order", { ascending: true });
    if (taskError) { console.error(taskError); }

    const customers = (custData || []).map(c => ({
      ...c,
      tasks: (taskData || []).filter(t => t.customer_id === c.id) as Task[],
    }));
    setCustomers(customers);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const addCustomer = async (cust: Omit<Customer, "id" | "created_at" | "tasks">) => {
    const { data, error } = await supabase.from("customers").insert(cust).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setCustomers(prev => [...prev, { ...data, tasks: [] }]);
    toast({ title: "เพิ่มลูกค้าสำเร็จ!" });
    return data;
  };

  const updateCustomer = async (id: string, updates: Partial<Omit<Customer, "id" | "created_at" | "tasks">>) => {
    const { data, error } = await supabase.from("customers").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    toast({ title: "อัปเดตลูกค้าสำเร็จ!" });
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCustomers(prev => prev.filter(c => c.id !== id));
    toast({ title: "ลบลูกค้าสำเร็จ!" });
  };

  const addTask = async (task: Omit<Task, "id" | "created_at">) => {
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setCustomers(prev => prev.map(c =>
      c.id === task.customer_id ? { ...c, tasks: [...c.tasks, data as Task] } : c
    ));
    toast({ title: "เพิ่มงานสำเร็จ!" });
    return data;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCustomers(prev => prev.map(c => ({
      ...c,
      tasks: c.tasks.map(t => t.id === id ? data as Task : t)
    })));
  };

  const deleteTask = async (id: string, customerId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, tasks: c.tasks.filter(t => t.id !== id) } : c
    ));
    toast({ title: "ลบงานสำเร็จ!" });
  };

  // Persist reordered customers — assigns new sort_order values and updates local state immediately
  const reorderCustomers = async (reordered: Customer[]) => {
    const withNewOrder = reordered.map((c, idx) => ({
      ...c,
      sort_order: c.month * 10000 + idx,
    }));
    const reorderedIds = new Set(reordered.map(c => c.id));

    setCustomers(prev => {
      const updated = prev.map(c => {
        const found = withNewOrder.find(r => r.id === c.id);
        return found ? found : c;
      });
      return updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    await Promise.all(
      withNewOrder
        .filter(c => reorderedIds.has(c.id))
        .map(c => supabase.from("customers").update({ sort_order: c.sort_order }).eq("id", c.id))
    );
  };

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, addTask, updateTask, deleteTask, refetch: fetchCustomers, reorderCustomers };
}
