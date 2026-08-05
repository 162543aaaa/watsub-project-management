import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "./useNotifications";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";

export interface LeaveRequest {
  id: string;
  requested_by: string;
  leave_type: string;
  leave_start: string;
  leave_end: string;
  leave_reason: string;
  status: "Pending" | "Approved" | "Rejected";
  requested_date: string;
  created_at?: string;
}

export function useLeave() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  const fetchLeaves = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setLeaves((data || []) as LeaveRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeaves(); }, []);

  const addLeave = async (leave: Omit<LeaveRequest, "id" | "created_at">) => {
    const { data, error } = await supabase.from("leave_requests").insert(leave).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setLeaves(prev => [data as LeaveRequest, ...prev]);
    void autoSyncToGoogleSheets("leave_requests", data);
    // Add notification
    await addNotification({
      title: "คำขอลาใหม่",
      message: `${leave.requested_by} ขอลา ${leave.leave_type} ตั้งแต่ ${leave.leave_start} ถึง ${leave.leave_end}`,
      type: "info",
      is_read: false,
    });
    toast({ title: "ส่งคำขอลาสำเร็จ!" });
    return data;
  };

  const updateStatus = async (id: string, status: "Approved" | "Rejected") => {
    const leave = leaves.find(l => l.id === id);
    const { data, error } = await supabase.from("leave_requests").update({ status }).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setLeaves(prev => prev.map(l => l.id === id ? data as LeaveRequest : l));
    void autoSyncToGoogleSheets("leave_requests", data);
    if (leave) {
      await addNotification({
        title: status === "Approved" ? "อนุมัติการลา" : "ปฏิเสธการลา",
        message: `คำขอลาของ ${leave.requested_by} ได้รับการ${status === "Approved" ? "อนุมัติ" : "ปฏิเสธ"}แล้ว`,
        type: status === "Approved" ? "success" : "error",
        is_read: false,
      });
    }
    toast({ title: status === "Approved" ? "อนุมัติการลาสำเร็จ!" : "ปฏิเสธการลาแล้ว" });
  };

  const updateLeave = async (id: string, updates: Partial<Omit<LeaveRequest, "id" | "created_at">>) => {
    const { data, error } = await supabase.from("leave_requests").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setLeaves(prev => prev.map(l => l.id === id ? data as LeaveRequest : l));
    void autoSyncToGoogleSheets("leave_requests", data);
    toast({ title: "แก้ไขข้อมูลการลาสำเร็จ!" });
    return data;
  };

  const deleteLeave = async (id: string) => {
    const { error } = await supabase.from("leave_requests").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setLeaves(prev => prev.filter(l => l.id !== id));
    toast({ title: "ลบคำขอลาแล้ว" });
  };

  return { leaves, loading, addLeave, updateStatus, updateLeave, deleteLeave, refetch: fetchLeaves };
}
