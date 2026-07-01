import { ArrowDownTrayIcon, ArrowPathIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const tables = [
  { key: "customers", label: "ลูกค้า (Customers)", icon: "👥" },
  { key: "projects", label: "โปรเจกต์ (Projects)", icon: "📁" },
  { key: "tasks", label: "งาน (Tasks)", icon: "✅" },
  { key: "employees", label: "พนักงาน (Employees)", icon: "👤" },
  { key: "goals", label: "เป้าหมาย (Goals)", icon: "🎯" },
  { key: "leave_requests", label: "การลา (Leave Requests)", icon: "✈️" },
  { key: "notifications", label: "แจ้งเตือน (Notifications)", icon: "🔔" },
] as const;

type TableKey = (typeof tables)[number]["key"];

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [
    "\uFEFF" + headers.join(","), // BOM for Excel Thai support
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  return csvRows.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Export() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [exported, setExported] = useState<Record<string, boolean>>({});

  const now = new Date();
  const [taskYear, setTaskYear] = useState<number>(now.getFullYear());
  const [taskMonth, setTaskMonth] = useState<number>(0); // 0 = ทั้งปี, 1-12
  const [taskDateField, setTaskDateField] = useState<"due_date" | "created_at" | "updated_at">("due_date");
  const [taskLoading, setTaskLoading] = useState(false);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);
  const months = [
     "ทั้งปี", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
     "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];

  const handleExportTasksByPeriod = async () => {
    setTaskLoading(true);
    try {
      let start: string;
      let end: string;
      if (taskMonth === 0) {
        start = `${taskYear}-01-01`;
        end = `${taskYear + 1}-01-01`;
      } else {
        const mm = String(taskMonth).padStart(2, "0");
        start = `${taskYear}-${mm}-01`;
        const nextY = taskMonth === 12 ? taskYear + 1 : taskYear;
        const nextM = taskMonth === 12 ? 1 : taskMonth + 1;
        end = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
      }

      let query = supabase.from("tasks").select("*").order(taskDateField, { ascending: true });
      // For date fields, use gte/lt. For created_at/updated_at (timestamptz), same pattern works.
      query = query.gte(taskDateField, start).lt(taskDateField, end);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "ไม่มีข้อมูล", description: `ไม่พบงานในช่วงเวลาที่เลือก` });
        return;
      }
      const csv = convertToCSV(data as Record<string, unknown>[]);
      const label = taskMonth === 0 ? `${taskYear}` : `${taskYear}-${String(taskMonth).padStart(2, "0")}`;
      downloadCSV(csv, `tasks_${taskDateField}_${label}.csv`);
      toast({ title: "สำเร็จ!", description: `ดาวน์โหลดงาน ${data.length} รายการ` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setTaskLoading(false);
    }
  };

  const handleExport = async (tableKey: TableKey) => {
    setLoading((p) => ({ ...p, [tableKey]: true }));
    try {
      const { data, error } = await supabase.from(tableKey).select("*");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "ไม่มีข้อมูล", description: `ตาราง ${tableKey} ยังไม่มีข้อมูล` });
        return;
      }
      const csv = convertToCSV(data as Record<string, unknown>[]);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `${tableKey}_${date}.csv`);
      setExported((p) => ({ ...p, [tableKey]: true }));
      toast({ title: "สำเร็จ!", description: `ดาวน์โหลด ${tableKey} เรียบร้อย (${data.length} รายการ)` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [tableKey]: false }));
    }
  };

  const handleExportAll = async () => {
    for (const t of tables) {
      await handleExport(t.key);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(210 40% 98%)" }}>
            Export ข้อมูล
          </h1>
          <p className="text-sm mt-1" style={{ color: "hsl(215 20% 55%)" }}>
            ดาวน์โหลดข้อมูลเป็น CSV เพื่อเปิดใน Google Sheets หรือ Excel
          </p>
        </div>
        <Button onClick={handleExportAll} className="gap-2">
          <ArrowDownTrayIcon className="w-4 h-4" />
          ดาวน์โหลดทั้งหมด
        </Button>
      </div>

      <Card style={{ background: "hsl(222 47% 10%)", borderColor: "hsl(222 47% 15%)" }}>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "hsl(210 40% 98%)" }}>
            <DocumentTextIcon className="w-5 h-5 inline-block mr-2" style={{ color: "hsl(191 91% 55%)" }} />
            วิธีนำเข้า Google Sheets
          </CardTitle>
          <CardDescription style={{ color: "hsl(215 20% 55%)" }}>
            1. ดาวน์โหลดไฟล์ CSV ด้านล่าง → 2. เปิด Google Sheets → 3. File → Import → Upload → เลือกไฟล์ CSV
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Export Tasks by month/year */}
      <Card style={{ background: "hsl(222 47% 10%)", borderColor: "hsl(222 47% 15%)" }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2" style={{ color: "hsl(210 40% 98%)" }}>
            <span className="text-xl">✅</span>
            Export Tasks ตามเดือน/ปี
          </CardTitle>
          <CardDescription style={{ color: "hsl(215 20% 55%)" }}>
            เลือกเดือนและปี เพื่อดาวน์โหลดงานทั้งหมดในช่วงเวลานั้น
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "hsl(215 20% 55%)" }}>ปี</label>
              <select
                value={taskYear}
                onChange={(e) => setTaskYear(Number(e.target.value))}
                className="h-9 rounded-md px-3 text-sm border"
                style={{ background: "hsl(222 47% 8%)", borderColor: "hsl(222 47% 20%)", color: "hsl(210 40% 98%)" }}
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "hsl(215 20% 55%)" }}>เดือน</label>
              <select
                value={taskMonth}
                onChange={(e) => setTaskMonth(Number(e.target.value))}
                className="h-9 rounded-md px-3 text-sm border"
                style={{ background: "hsl(222 47% 8%)", borderColor: "hsl(222 47% 20%)", color: "hsl(210 40% 98%)" }}
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "hsl(215 20% 55%)" }}>อ้างอิงจากวันที่</label>
              <select
                value={taskDateField}
                onChange={(e) => setTaskDateField(e.target.value as typeof taskDateField)}
                className="h-9 rounded-md px-3 text-sm border"
                style={{ background: "hsl(222 47% 8%)", borderColor: "hsl(222 47% 20%)", color: "hsl(210 40% 98%)" }}
              >
                <option value="due_date">Due date (กำหนดส่ง)</option>
                <option value="created_at">Created at (วันที่สร้าง)</option>
                <option value="updated_at">Updated at (วันที่อัปเดต)</option>
              </select>
            </div>
            <Button onClick={handleExportTasksByPeriod} disabled={taskLoading} className="gap-2">
              {taskLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              ดาวน์โหลด CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((t) => (
          <Card
            key={t.key}
            className="transition-all hover:scale-[1.02]"
            style={{ background: "hsl(222 47% 10%)", borderColor: "hsl(222 47% 15%)" }}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <span className="text-sm font-medium" style={{ color: "hsl(210 40% 98%)" }}>
                  {t.label}
                </span>
              </div>
              <Button
                size="sm"
                variant={exported[t.key] ? "outline" : "default"}
                disabled={loading[t.key]}
                onClick={() => handleExport(t.key)}
                className="gap-1.5"
              >
                {loading[t.key] ? (
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                ) : exported[t.key] ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                )}
                {exported[t.key] ? "เสร็จ" : "CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
