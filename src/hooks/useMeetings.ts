import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  note?: string | null;
  participants: string[];
  created_at?: string;
  updated_at?: string;
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setMeetings((data || []) as Meeting[]);
    setLoading(false);
  };

  useEffect(() => { fetchMeetings(); }, []);

  const addMeeting = async (meeting: Omit<Meeting, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase.from("meetings").insert(meeting).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setMeetings(prev => [data as Meeting, ...prev]);
    toast({ title: "เพิ่มการประชุมสำเร็จ!" });
    return data;
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    const { data, error } = await supabase.from("meetings").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setMeetings(prev => prev.map(m => m.id === id ? data as Meeting : m));
    toast({ title: "อัปเดตการประชุมสำเร็จ!" });
  };

  const deleteMeeting = async (id: string) => {
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    void autoSyncToGoogleSheets("meetings", { id }, "delete");
    setMeetings(prev => prev.filter(m => m.id !== id));
    toast({ title: "ลบการประชุมสำเร็จ!" });
  };

  return { meetings, loading, addMeeting, updateMeeting, deleteMeeting, refetch: fetchMeetings };
}
