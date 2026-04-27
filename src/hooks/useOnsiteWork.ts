import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";

export interface OnsiteWork {
  id: string;
  title: string;
  work_date: string;
  location?: string | null;
  note?: string | null;
  participants: string[];
  created_at?: string;
  updated_at?: string;
}

export function useOnsiteWork() {
  const [onsiteWork, setOnsiteWork] = useState<OnsiteWork[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnsiteWork = async () => {
    const { data, error } = await supabase
      .from("onsite_work")
      .select("*")
      .order("work_date", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setOnsiteWork((data || []) as OnsiteWork[]);
    setLoading(false);
  };

  useEffect(() => { fetchOnsiteWork(); }, []);

  const addOnsiteWork = async (work: Omit<OnsiteWork, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase.from("onsite_work").insert(work).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setOnsiteWork(prev => [data as OnsiteWork, ...prev]);
    toast({ title: "เพิ่มงานออกกองสำเร็จ!" });
    return data;
  };

  const updateOnsiteWork = async (id: string, updates: Partial<OnsiteWork>) => {
    const { data, error } = await supabase.from("onsite_work").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setOnsiteWork(prev => prev.map(w => w.id === id ? data as OnsiteWork : w));
    toast({ title: "อัปเดตงานออกกองสำเร็จ!" });
  };

  const deleteOnsiteWork = async (id: string) => {
    const { error } = await supabase.from("onsite_work").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    void autoSyncToGoogleSheets("onsite_work", { id }, "delete");
    setOnsiteWork(prev => prev.filter(w => w.id !== id));
    toast({ title: "ลบงานออกกองสำเร็จ!" });
  };

  return { onsiteWork, loading, addOnsiteWork, updateOnsiteWork, deleteOnsiteWork, refetch: fetchOnsiteWork };
}
