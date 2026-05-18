import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  is_read: boolean;
  created_at: string;
  recipient_user_id?: string | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`recipient_user_id.is.null`)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setNotifications((data || []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const addNotification = async (notif: Omit<Notification, "id" | "created_at">) => {
    const { data, error } = await supabase.from("notifications").insert(notif).select().single();
    if (error) { console.error(error); return null; }
    setNotifications(prev => [data as Notification, ...prev]);
    return data;
  };

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) { console.error(error); return; }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    if (error) { console.error(error); return; }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast({ title: "อ่านทุกการแจ้งเตือนแล้ว" });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, loading, addNotification, markRead, markAllRead, unreadCount, refetch: fetchNotifications };
}
