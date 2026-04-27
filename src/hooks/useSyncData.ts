import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ใส่ URL ของคุณตรงนี้
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwubEYbHVadOuZ4Ju3747SwsRDIyS_yTa_-Bf5PYzkNNrR7BT2s9gtZNnnl5-IjWpmy/exec";

// รายชื่อตารางทั้งหมดที่ต้องการ Sync
const TABLES_TO_SYNC = ["projects", "tasks", "customers", "employees", "leave_requests", "kpi_evaluations", "goals"];

export const useSyncData = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    toast({ title: "กำลังเริ่มการ Sync...", description: "กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้" });

    try {
      for (const tableName of TABLES_TO_SYNC) {
        console.log(`⏳ กำลังดึงข้อมูลจากตาราง: ${tableName}...`);

        // 1. ดึงข้อมูลจาก Supabase
        const { data, error } = await supabase.from(tableName as any).select("*");

        if (error) {
          console.error(`❌ ดึงข้อมูล ${tableName} พลาด:`, error);
          continue; // ข้ามไปตารางอื่นถ้าพัง
        }

        if (!data || data.length === 0) {
          console.log(`⚠️ ตาราง ${tableName} ไม่มีข้อมูล ข้าม...`);
          continue;
        }

        console.log(`🚀 กำลังส่ง ${data.length} แถวจาก ${tableName} ไป Google Sheets...`);

        // 2. ส่งข้อมูลทีละแถวไป Google Sheets (ป้องกัน Timeout)
        for (const row of data) {
          await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              table_name: tableName,
              data: row,
            }),
          });
          // หน่วงเวลา 200ms ป้องกัน Google Block (Rate Limit)
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      toast({ title: "✅ Sync สำเร็จ!", description: "ข้อมูลทั้งหมดถูกส่งไป Google Sheets แล้ว" });
    } catch (err) {
      console.error("Critical Sync Error:", err);
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "ดูรายละเอียดที่ Console", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, handleSyncAll };
};
