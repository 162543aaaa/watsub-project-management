import { useState, useMemo } from "react";
import { format, addDays, parseISO, startOfWeek, endOfWeek } from "date-fns";
import {
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart2,
  CalendarDays,
  Zap,
} from "lucide-react";
import { useWorkload, DEFAULT_WEEKLY_CAPACITY, WorkloadData } from "@/hooks/useWorkload";
import { supabase } from "@/integrations/supabase/client";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { Card, CardContent } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

type UtilizationTier = "overloaded" | "nearing" | "normal";

function getTier(pct: number): UtilizationTier {
  if (pct > 100) return "overloaded";
  if (pct >= 75) return "nearing";
  return "normal";
}

const TIER_CONFIG: Record<
  UtilizationTier,
  { color: string; bg: string; border: string; label: string }
> = {
  overloaded: {
    color: "hsl(0 84% 60%)",
    bg: "hsl(0 84% 60% / 0.08)",
    border: "hsl(0 84% 60% / 0.25)",
    label: "Overloaded",
  },
  nearing: {
    color: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 50% / 0.08)",
    border: "hsl(38 92% 50% / 0.25)",
    label: "Nearing Limit",
  },
  normal: {
    color: "hsl(142 76% 36%)",
    bg: "hsl(142 76% 36% / 0.08)",
    border: "hsl(142 76% 36% / 0.2)",
    label: "Normal",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
      style={{ background: `${color}14`, borderColor: `${color}40` }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div>
        <div className="text-lg font-bold leading-none" style={{ color }}>
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function UtilizationBar({
  pct,
  color,
}: {
  pct: number;
  color: string;
}) {
  const clampedPct = Math.min(pct, 100);
  const overflowPct = pct > 100 ? Math.min(pct - 100, 30) : 0; // visual overflow hint

  return (
    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
      {/* Base fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${clampedPct}%`, background: color }}
      />
      {/* Overflow stripes (>100%) */}
      {overflowPct > 0 && (
        <div
          className="absolute inset-y-0 right-0 rounded-r-full opacity-60"
          style={{
            width: `${overflowPct}%`,
            background: `repeating-linear-gradient(
              45deg,
              ${color},
              ${color} 3px,
              transparent 3px,
              transparent 6px
            )`,
          }}
        />
      )}
    </div>
  );
}

function EmployeeCard({
  item,
  index,
}: {
  item: WorkloadData;
  index: number;
}) {
  const tier = getTier(item.utilization_percentage);
  const cfg = TIER_CONFIG[tier];

  return (
    <Card
      className="relative overflow-hidden transition-shadow hover:shadow-md"
      style={{
        borderColor: cfg.border,
        background: "hsl(var(--card))",
      }}
    >
      {/* Tier accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: cfg.color }}
      />

      <CardContent className="p-4 pt-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <EmployeeAvatar
            name={item.display_name}
            avatar={item.avatar_url ?? undefined}
            size="md"
            index={index}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {item.display_name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {item.position || "Team Member"}
            </p>
          </div>
          {/* Tier badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" style={{ color: cfg.color }} />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {item.active_tasks_count}
              </span>{" "}
              active task{item.active_tasks_count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {item.total_estimated_hours}h
            </span>{" "}
            / {DEFAULT_WEEKLY_CAPACITY}h
          </div>
        </div>

        {/* Progress bar */}
        <UtilizationBar pct={item.utilization_percentage} color={cfg.color} />

        {/* Utilization % label */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-muted-foreground">Utilization</span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: cfg.color }}
          >
            {item.utilization_percentage}%
            {item.utilization_percentage > 100 && (
              <span className="ml-1 text-[10px] font-normal opacity-80">
                (+{item.utilization_percentage - 100}% over)
              </span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap (preserved from original implementation)
// ─────────────────────────────────────────────────────────────────────────────

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

function getCellStyle(cell: WorkloadCell): React.CSSProperties {
  if (cell.is_on_leave) return { background: "hsl(215 20% 20% / 0.6)", color: "hsl(215 20% 50%)" };
  if (cell.task_count > 3) return { background: "hsl(0 84% 60% / 0.15)", color: "hsl(0 84% 70%)" };
  if (cell.task_count >= 1) return { background: "hsl(142 76% 36% / 0.15)", color: "hsl(142 76% 55%)" };
  return {};
}

const DAYS_AHEAD = 14;

function HeatmapView() {
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
    }
    setLoading(false);
  };

  useState(() => { fetchHeatmap(); });

  if (error) {
    return (
      <div className="rounded-xl border border-border p-8 text-center text-sm" style={{ background: "hsl(0 84% 60% / 0.06)" }}>
        <p className="font-semibold text-destructive mb-1">Could not load heatmap</p>
        <p className="text-muted-foreground text-xs">{error}</p>
      </div>
    );
  }
  if (loading) {
    return <div className="h-64 rounded-xl border border-border animate-pulse bg-card" />;
  }
  if (rows.length === 0) {
    return (
      <div className="text-center py-20">
        <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm">No heatmap data for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "hsl(222 47% 11%)" }}>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground sticky left-0 z-10 min-w-[160px]"
              style={{ background: "hsl(222 47% 11%)", borderRight: "1px solid hsl(222 47% 18%)" }}>
              Employee
            </th>
            {dateColumns.map((date) => {
              const d = parseISO(date);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = date === startDate;
              return (
                <th key={date} className="px-2 py-3 text-center min-w-[64px]"
                  style={{ borderLeft: "1px solid hsl(222 47% 15%)", background: isToday ? "hsl(191 91% 37% / 0.1)" : isWeekend ? "hsl(222 47% 9%)" : undefined }}>
                  <div className={`text-[10px] font-medium ${isToday ? "text-primary" : isWeekend ? "text-muted-foreground/40" : "text-muted-foreground"}`}>{format(d, "EEE")}</div>
                  <div className={`text-xs font-bold ${isToday ? "text-primary" : isWeekend ? "text-muted-foreground/40" : "text-foreground"}`}>{format(d, "d")}</div>
                  <div className={`text-[9px] ${isToday ? "text-primary/70" : "text-muted-foreground/50"}`}>{format(d, "MMM")}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={row.employee_id} style={{ borderTop: "1px solid hsl(222 47% 15%)" }} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-xs font-medium sticky left-0 z-10 whitespace-nowrap"
                style={{ background: rowIdx % 2 === 0 ? "hsl(222 47% 10%)" : "hsl(222 47% 9%)", borderRight: "1px solid hsl(222 47% 18%)", color: "hsl(215 20% 80%)" }}>
                {row.employee_name}
              </td>
              {dateColumns.map((date) => {
                const cell = row.days[date] ?? { task_count: 0, is_on_leave: false };
                const d = parseISO(date);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = date === startDate;
                const cs = getCellStyle(cell);
                return (
                  <td key={date} className="px-2 py-3 text-center"
                    title={cell.is_on_leave ? `${row.employee_name} is on leave` : `${row.employee_name}: ${cell.task_count} task(s) due`}
                    style={{
                      borderLeft: "1px solid hsl(222 47% 15%)",
                      background: cell.is_on_leave ? cs.background : cell.task_count > 0 ? cs.background : isToday ? "hsl(191 91% 37% / 0.05)" : isWeekend ? "hsl(222 47% 8%)" : undefined,
                      color: cs.color,
                    }}>
                    {cell.is_on_leave
                      ? <span className="text-base leading-none">🌴</span>
                      : cell.task_count === 0
                      ? <span className="text-xs text-muted-foreground/40">—</span>
                      : <span className="text-xs font-semibold">{cell.task_count}</span>
                    }
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type ViewTab = "utilization" | "heatmap";

export default function Workload() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [activeTab, setActiveTab] = useState<ViewTab>("utilization");

  const { data, isLoading, error, refetch } = useWorkload(startDate, endDate);

  // Summary stats
  const stats = useMemo(() => {
    const overloaded = data.filter((d) => d.utilization_percentage > 100).length;
    const nearing = data.filter((d) => d.utilization_percentage >= 75 && d.utilization_percentage <= 100).length;
    const normal = data.filter((d) => d.utilization_percentage < 75).length;
    return { total: data.length, overloaded, nearing, normal };
  }, [data]);

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(280 65% 60% / 0.15)" }}
          >
            <Users className="w-5 h-5" style={{ color: "hsl(280 65% 70%)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Team Workload</h1>
            <p className="text-sm text-muted-foreground">
              Capacity planning · {DEFAULT_WEEKLY_CAPACITY}h/week baseline
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date range picker */}
          <div className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-xl px-3 py-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-foreground outline-none w-[110px]"
            />
            <span className="text-muted-foreground text-xs">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-foreground outline-none w-[110px]"
            />
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 border border-border">
            <button
              onClick={() => setActiveTab("utilization")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "utilization"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              Utilization
            </button>
            <button
              onClick={() => setActiveTab("heatmap")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "heatmap"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              Heatmap
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary strip (utilization view only) ──────────────────────── */}
      {activeTab === "utilization" && (
        <div className="flex flex-wrap gap-3">
          <StatPill
            label="Total Employees"
            value={stats.total}
            color="hsl(215 20% 65%)"
            icon={Users}
          />
          <StatPill
            label="Overloaded (>100%)"
            value={stats.overloaded}
            color="hsl(0 84% 60%)"
            icon={AlertTriangle}
          />
          <StatPill
            label="Nearing Limit (75–100%)"
            value={stats.nearing}
            color="hsl(38 92% 50%)"
            icon={Clock}
          />
          <StatPill
            label="Available (<75%)"
            value={stats.normal}
            color="hsl(142 76% 36%)"
            icon={CheckCircle2}
          />
        </div>
      )}

      {/* ── Utilization Legend ─────────────────────────────────────────── */}
      {activeTab === "utilization" && (
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {(["normal", "nearing", "overloaded"] as UtilizationTier[]).map((tier) => {
            const c = TIER_CONFIG[tier];
            return (
              <div key={tier} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: c.color, opacity: 0.85 }}
                />
                <span className="text-muted-foreground">
                  {tier === "normal" && "< 75% — Available / Normal"}
                  {tier === "nearing" && "75–100% — Nearing Limit"}
                  {tier === "overloaded" && "> 100% — Overloaded / Burnout Risk"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Content Area ───────────────────────────────────────────────── */}
      {activeTab === "utilization" ? (
        error ? (
          <div
            className="rounded-xl border border-border p-8 text-center text-sm"
            style={{ background: "hsl(0 84% 60% / 0.06)" }}
          >
            <AlertTriangle className="w-6 h-6 mx-auto text-destructive mb-2" />
            <p className="font-semibold text-destructive mb-1">
              Could not load workload data
            </p>
            <p className="text-muted-foreground text-xs">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              No employees found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.map((item, idx) => (
              <EmployeeCard key={item.employee_id} item={item} index={idx} />
            ))}
          </div>
        )
      ) : (
        /* ── Heatmap Tab ──────────────────────────────────────────────── */
        <>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {[
              { color: "hsl(142 76% 36% / 0.15)", border: "hsl(142 76% 36% / 0.3)", label: "1–3 tasks (normal)" },
              { color: "hsl(0 84% 60% / 0.15)", border: "hsl(0 84% 60% / 0.3)", label: ">3 tasks (overloaded)" },
              { color: "hsl(215 20% 20% / 0.6)", border: "hsl(215 20% 30%)", label: "On leave" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ background: l.color, border: `1px solid ${l.border}` }} />
                <span className="text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
          <HeatmapView />
        </>
      )}
    </div>
  );
}
