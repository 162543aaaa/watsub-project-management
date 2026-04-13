import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parseISO } from "date-fns";
import { Users, RefreshCw, PalmtreeIcon } from "lucide-react";

interface WorkloadCell {
  task_count: number;
  is_on_leave: boolean;
}

interface WorkloadRow {
  employee_id: string;
  employee_name: string;
  days: Record<string, WorkloadCell>; // key = "YYYY-MM-DD"
}

interface RpcRow {
  employee_id: string;
  employee_name: string;
  date: string;
  task_count: number;
  is_on_leave: boolean;
}

function CellBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-xs text-muted-foreground/40">—</span>;
  return (
    <span className="text-xs font-semibold">
      {count}
    </span>
  );
}

function getCellStyle(cell: WorkloadCell): React.CSSProperties {
  if (cell.is_on_leave) {
    return {
      background: "hsl(215 20% 20% / 0.6)",
      color: "hsl(215 20% 50%)",
    };
  }
  if (cell.task_count > 3) {
    return {
      background: "hsl(0 84% 60% / 0.15)",
      color: "hsl(0 84% 70%)",
    };
  }
  if (cell.task_count >= 1) {
    return {
      background: "hsl(142 76% 36% / 0.15)",
      color: "hsl(142 76% 55%)",
    };
  }
  return {};
}

const DAYS_AHEAD = 14;

export default function Workload() {
  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const startDate = format(today, "yyyy-MM-dd");
  const endDate = format(addDays(today, DAYS_AHEAD - 1), "yyyy-MM-dd");

  // Build the 14-day column headers
  const dateColumns: string[] = Array.from({ length: DAYS_AHEAD }, (_, i) =>
    format(addDays(today, i), "yyyy-MM-dd")
  );

  const fetchWorkload = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_team_workload_heatmap", {
        start_date: startDate,
        end_date: endDate,
      });

      if (rpcError) throw rpcError;

      const rawRows = (data ?? []) as RpcRow[];

      // Group by employee
      const employeeMap: Record<string, WorkloadRow> = {};
      for (const row of rawRows) {
        if (!employeeMap[row.employee_id]) {
          employeeMap[row.employee_id] = {
            employee_id: row.employee_id,
            employee_name: row.employee_name,
            days: {},
          };
        }
        employeeMap[row.employee_id].days[row.date] = {
          task_count: row.task_count,
          is_on_leave: row.is_on_leave,
        };
      }

      setRows(Object.values(employeeMap).sort((a, b) => a.employee_name.localeCompare(b.employee_name)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load workload data";
      setError(msg);
    }
    setLoading(false);
  };

  useEffect(() => { fetchWorkload(); }, []);

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(280 65% 60% / 0.15)" }}
          >
            <Users className="w-5 h-5" style={{ color: "hsl(280 65% 70%)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Team Workload</h1>
            <p className="text-sm text-muted-foreground">
              Task distribution for the next {DAYS_AHEAD} days
            </p>
          </div>
        </div>
        <button
          onClick={fetchWorkload}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: "hsl(142 76% 36% / 0.15)", border: "1px solid hsl(142 76% 36% / 0.3)" }} />
          <span className="text-muted-foreground">1–3 tasks (normal)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: "hsl(0 84% 60% / 0.15)", border: "1px solid hsl(0 84% 60% / 0.3)" }} />
          <span className="text-muted-foreground">&gt;3 tasks (overloaded)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: "hsl(215 20% 20% / 0.6)", border: "1px solid hsl(215 20% 30%)" }} />
          <span className="text-muted-foreground">On leave</span>
        </div>
      </div>

      {/* Heatmap table */}
      {error ? (
        <div
          className="rounded-xl border border-border p-8 text-center text-sm"
          style={{ background: "hsl(0 84% 60% / 0.08)" }}
        >
          <p className="font-semibold text-destructive mb-1">Could not load workload data</p>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Make sure the <code className="bg-muted px-1 rounded">get_team_workload_heatmap</code> RPC function exists in Supabase.
          </p>
        </div>
      ) : loading ? (
        <div className="overflow-auto rounded-xl border border-border animate-pulse">
          <div className="h-64 bg-card" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No workload data for this period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "hsl(222 47% 11%)" }}>
                {/* Employee column */}
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground sticky left-0 z-10 min-w-[160px]"
                  style={{ background: "hsl(222 47% 11%)", borderRight: "1px solid hsl(222 47% 18%)" }}
                >
                  Employee
                </th>
                {dateColumns.map(date => {
                  const d = parseISO(date);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = date === startDate;
                  return (
                    <th
                      key={date}
                      className="px-2 py-3 text-center min-w-[64px]"
                      style={{
                        borderLeft: "1px solid hsl(222 47% 15%)",
                        background: isToday ? "hsl(191 91% 37% / 0.1)" : isWeekend ? "hsl(222 47% 9%)" : undefined,
                      }}
                    >
                      <div className={`text-[10px] font-medium ${isToday ? "text-primary" : isWeekend ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                        {format(d, "EEE")}
                      </div>
                      <div className={`text-xs font-bold ${isToday ? "text-primary" : isWeekend ? "text-muted-foreground/40" : "text-foreground"}`}>
                        {format(d, "d")}
                      </div>
                      <div className={`text-[9px] ${isToday ? "text-primary/70" : "text-muted-foreground/50"}`}>
                        {format(d, "MMM")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr
                  key={row.employee_id}
                  style={{ borderTop: "1px solid hsl(222 47% 15%)" }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Employee name */}
                  <td
                    className="px-4 py-3 text-xs font-medium sticky left-0 z-10 whitespace-nowrap"
                    style={{
                      background: rowIdx % 2 === 0 ? "hsl(222 47% 10%)" : "hsl(222 47% 9%)",
                      borderRight: "1px solid hsl(222 47% 18%)",
                      color: "hsl(215 20% 80%)",
                    }}
                  >
                    {row.employee_name}
                  </td>
                  {/* Day cells */}
                  {dateColumns.map(date => {
                    const cell = row.days[date] ?? { task_count: 0, is_on_leave: false };
                    const d = parseISO(date);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = date === startDate;
                    const cellStyle = getCellStyle(cell);
                    return (
                      <td
                        key={date}
                        className="px-2 py-3 text-center"
                        title={
                          cell.is_on_leave
                            ? `${row.employee_name} is on leave`
                            : `${row.employee_name}: ${cell.task_count} task${cell.task_count !== 1 ? "s" : ""} due`
                        }
                        style={{
                          borderLeft: "1px solid hsl(222 47% 15%)",
                          background: cell.is_on_leave
                            ? cellStyle.background
                            : cell.task_count > 0
                            ? cellStyle.background
                            : isToday
                            ? "hsl(191 91% 37% / 0.05)"
                            : isWeekend
                            ? "hsl(222 47% 8%)"
                            : undefined,
                          color: cellStyle.color,
                        }}
                      >
                        {cell.is_on_leave ? (
                          <span title="On leave" className="text-base leading-none">🌴</span>
                        ) : (
                          <CellBadge count={cell.task_count} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
