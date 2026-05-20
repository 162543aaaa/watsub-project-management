import { useState, useEffect } from "react";
import { format, addDays, parseISO } from "date-fns";
import { UsersIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WorkloadCell {
  task_count: number;
  is_on_leave: boolean;
}

interface HeatmapRow {
  employee_id: string;
  employee_name: string;
  days: Record<string, WorkloadCell>;
}

interface RpcRow {
  employee_id: string;
  employee_name: string;
  date: string;
  task_count: number;
  is_on_leave: boolean;
}

const DAYS_AHEAD = 14;

export function HeatmapView() {
  const [rows, setRows] = useState<HeatmapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const startDate = format(today, "yyyy-MM-dd");
  const endDate = format(addDays(today, DAYS_AHEAD - 1), "yyyy-MM-dd");
  
  const dateColumns: string[] = Array.from({ length: DAYS_AHEAD }, (_, i) =>
    format(addDays(today, i), "yyyy-MM-dd")
  );

  const fetchHeatmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_team_workload_heatmap",
        { start_date: startDate, end_date: endDate }
      );
      if (rpcError) throw rpcError;
      
      const raw = (data ?? []) as RpcRow[];
      const map: Record<string, HeatmapRow> = {};
      
      for (const r of raw) {
        if (!map[r.employee_id]) {
          map[r.employee_id] = { employee_id: r.employee_id, employee_name: r.employee_name, days: {} };
        }
        map[r.employee_id].days[r.date] = { task_count: r.task_count, is_on_leave: r.is_on_leave };
      }
      setRows(Object.values(map).sort((a, b) => a.employee_name.localeCompare(b.employee_name)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load heatmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [startDate, endDate]); // Dependencies ensure it runs once on mount

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-sm">
        <p className="font-semibold text-destructive mb-1">Could not load heatmap</p>
        <p className="text-destructive/80 text-xs">{error}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="h-64 rounded-xl border border-border animate-pulse bg-muted/50" />;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 rounded-xl border border-border bg-card">
        <UsersIcon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm font-medium">No heatmap data available for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/80">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground sticky left-0 z-20 min-w-[160px] bg-muted border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              Employee
            </th>
            {dateColumns.map((date) => {
              const d = parseISO(date);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = date === startDate;
              return (
                <th 
                  key={date} 
                  className={cn(
                    "px-2 py-3 text-center min-w-[64px] border-l border-border/50 transition-colors",
                    isToday ? "bg-primary/5" : isWeekend ? "bg-muted/50" : ""
                  )}
                >
                  <div className={cn("text-[10px] font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
                    {format(d, "EEE")}
                  </div>
                  <div className={cn("text-xs font-bold my-0.5", isToday ? "text-primary" : isWeekend ? "text-muted-foreground/70" : "text-foreground")}>
                    {format(d, "d")}
                  </div>
                  <div className={cn("text-[9px] font-medium uppercase tracking-wider", isToday ? "text-primary/70" : "text-muted-foreground/60")}>
                    {format(d, "MMM")}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => (
            <tr key={row.employee_id} className="hover:bg-muted/30 transition-colors group">
              <td className="px-4 py-3 text-xs font-medium sticky left-0 z-10 whitespace-nowrap bg-card group-hover:bg-muted/30 border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-foreground">
                {row.employee_name}
              </td>
              {dateColumns.map((date) => {
                const cell = row.days[date] ?? { task_count: 0, is_on_leave: false };
                const d = parseISO(date);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = date === startDate;
                
                // Determine styling classes based on cell data
                let cellClasses = "";
                let textColor = "";
                
                if (cell.is_on_leave) {
                  cellClasses = "bg-muted-foreground/10 dark:bg-muted/50";
                } else if (cell.task_count > 3) {
                  cellClasses = "bg-destructive/15 dark:bg-destructive/20 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]";
                  textColor = "text-destructive font-bold";
                } else if (cell.task_count >= 1) {
                  cellClasses = "bg-emerald-500/15 dark:bg-emerald-500/20 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]";
                  textColor = "text-emerald-700 dark:text-emerald-400 font-semibold";
                } else {
                  cellClasses = isToday ? "bg-primary/5" : isWeekend ? "bg-muted/30" : "";
                  textColor = "text-muted-foreground/40";
                }

                return (
                  <td 
                    key={date} 
                    className={cn("px-2 py-3 text-center border-l border-border/50 transition-colors", cellClasses)}
                    title={cell.is_on_leave ? `${row.employee_name} is on leave` : `${row.employee_name}: ${cell.task_count} task(s) due`}
                  >
                    {cell.is_on_leave ? (
                      <span className="text-sm leading-none opacity-80" role="img" aria-label="On leave">🌴</span>
                    ) : cell.task_count === 0 ? (
                      <span className={textColor}>—</span>
                    ) : (
                      <span className={textColor}>{cell.task_count}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
