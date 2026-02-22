import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
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
          <Download className="w-4 h-4" />
          ดาวน์โหลดทั้งหมด
        </Button>
      </div>

      <Card style={{ background: "hsl(222 47% 10%)", borderColor: "hsl(222 47% 15%)" }}>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "hsl(210 40% 98%)" }}>
            <FileSpreadsheet className="w-5 h-5 inline-block mr-2" style={{ color: "hsl(191 91% 55%)" }} />
            วิธีนำเข้า Google Sheets
          </CardTitle>
          <CardDescription style={{ color: "hsl(215 20% 55%)" }}>
            1. ดาวน์โหลดไฟล์ CSV ด้านล่าง → 2. เปิด Google Sheets → 3. File → Import → Upload → เลือกไฟล์ CSV
          </CardDescription>
        </CardHeader>
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : exported[t.key] ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
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
