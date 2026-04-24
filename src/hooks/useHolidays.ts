import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
  holiday_type: string;
  color_tag: string | null;
  start_date: string;
  end_date: string;
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHolidays = useCallback(async () => {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("holiday_date", { ascending: true });
    if (error) {
      console.error("Error fetching holidays:", error);
    } else {
      setHolidays(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const addHoliday = async (holiday: Omit<Holiday, "id">) => {
    // start_date/end_date are custom columns not yet in the generated Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("holidays").insert(holiday as any);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "เพิ่มวันหยุดสำเร็จ!" });
      fetchHolidays();
    }
  };

  const updateHoliday = async (id: string, updates: Partial<Omit<Holiday, "id">>) => {
    // start_date/end_date are custom columns not yet in the generated Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("holidays").update(updates as any).eq("id", id);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "แก้ไขวันหยุดสำเร็จ!" });
      fetchHolidays();
    }
  };

  const deleteHoliday = async (id: string) => {
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบวันหยุดสำเร็จ!" });
      fetchHolidays();
    }
  };

  return { holidays, loading, addHoliday, updateHoliday, deleteHoliday, refetch: fetchHolidays };
}
