import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Employee {
  id: string;
  name: string;
  position: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  promptpay_qr?: string;
  start_date?: string;
  note?: string;
  created_at?: string;
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.error(error); return; }
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const addEmployee = async (emp: Omit<Employee, "id" | "created_at">) => {
    const { data, error } = await supabase.from("employees").insert(emp).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setEmployees(prev => [...prev, data]);
    toast({ title: "เพิ่มพนักงานสำเร็จ!" });
    return data;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const { data, error } = await supabase.from("employees").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEmployees(prev => prev.map(e => e.id === id ? data : e));
    toast({ title: "อัปเดตพนักงานสำเร็จ!" });
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast({ title: "ลบพนักงานสำเร็จ!" });
  };

  return { employees, loading, addEmployee, updateEmployee, deleteEmployee, refetch: fetchEmployees };
}
