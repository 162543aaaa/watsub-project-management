import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Goal {
  id: string;
  title: string;
  type: "individual" | "team";
  target_value: number;
  current_value: number;
  deadline: string;
  assigned_to?: string;
  created_at?: string;
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    setGoals((data || []) as Goal[]);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, []);

  const addGoal = async (goal: Omit<Goal, "id" | "created_at">) => {
    const { data, error } = await supabase.from("goals").insert(goal).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setGoals(prev => [...prev, data as Goal]);
    toast({ title: "เพิ่มเป้าหมายสำเร็จ!" });
    return data;
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const { data, error } = await supabase.from("goals").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setGoals(prev => prev.map(g => g.id === id ? data as Goal : g));
    toast({ title: "อัปเดตเป้าหมายสำเร็จ!" });
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setGoals(prev => prev.filter(g => g.id !== id));
    toast({ title: "ลบเป้าหมายสำเร็จ!" });
  };

  return { goals, loading, addGoal, updateGoal, deleteGoal, refetch: fetchGoals };
}
