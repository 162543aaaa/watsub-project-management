import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxmiLzLyO_OHxznfziAn4M4yd6AyKKeFl1rBu9mYbbxWNInY14tA_MiSotZxHVIkuux/exec";
const TABLES_TO_SYNC = ["projects", "tasks", "customers", "employees", "leave_requests", "kpi_evaluations", "goals"];

export const useSyncData = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    toast({ title: "⏳ เริ่มกระบวนการ Sync...", description: "ระบบกำลังทำงานเบื้องหลัง" });

    try {
      for (const tableName of TABLES_TO_SYNC) {
        const { data, error } = await supabase.from(tableName as any).select("*");
        if (error || !data || data.length === 0) continue;

        for (const row of data) {
          const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ table_name: tableName, data: row }),
          });

          const result = await response.json();
          console.log(`[${tableName}] ID: ${row.id} -> ${result.action}`);

          await new Promise((res) => setTimeout(res, 250));
        }
      }
      toast({ title: "✅ Sync สำเร็จ!", description: "สำรองข้อมูลทุกตารางเรียบร้อย" });
    } catch (err) {
      console.error("Sync Error:", err);
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "กรุณาลองใหม่อีกครั้ง", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, handleSyncAll };
};
