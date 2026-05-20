import { useState, useMemo, useEffect } from "react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { 
  UsersIcon, 
  CalendarDaysIcon, 
  ChartBarIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';

import { useWorkload, DEFAULT_WEEKLY_CAPACITY, type WorkloadData } from "@/hooks/useWorkload";
import WorkloadDrillDown from "@/components/WorkloadDrillDown";
import { StatPill } from "./workload/components/StatPill";
import { EmployeeCard } from "./workload/components/EmployeeCard";
import { HeatmapView } from "./workload/components/HeatmapView";
import { cn } from "@/lib/utils";

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
  const [selectedEmployee, setSelectedEmployee] = useState<WorkloadData | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [pendingDrillEmployeeId, setPendingDrillEmployeeId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useWorkload(startDate, endDate);

  // When user clicks an employee name in the heatmap, expand the date range to
  // cover the next 14 days, then open the drill-down once that data arrives.
  useEffect(() => {
    if (!pendingDrillEmployeeId || isLoading) return;
    const found = data.find((d) => d.employee_id === pendingDrillEmployeeId);
    if (found) {
      setSelectedEmployee(found);
      setIsDrillDownOpen(true);
      setPendingDrillEmployeeId(null);
    }
  }, [pendingDrillEmployeeId, isLoading, data]);

  const handleHeatmapEmployeeClick = (employeeId: string) => {
    const today = new Date();
    setStartDate(format(today, "yyyy-MM-dd"));
    setEndDate(format(addDays(today, 13), "yyyy-MM-dd"));
    setPendingDrillEmployeeId(employeeId);
  };

  // Summary stats memoized
  const stats = useMemo(() => {
    const overloaded = data.filter((d) => d.utilization_percentage > 100).length;
    const nearing = data.filter((d) => d.utilization_percentage >= 75 && d.utilization_percentage <= 100).length;
    const normal = data.filter((d) => d.utilization_percentage < 75).length;
    return { total: data.length, overloaded, nearing, normal };
  }, [data]);

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-primary/10 border border-primary/20 shadow-inner">
            <UsersIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Workload</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Capacity planning · <span className="text-foreground">{DEFAULT_WEEKLY_CAPACITY}h/week</span> baseline
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date range picker */}
          <div className="flex items-center gap-2 bg-card border border-border shadow-sm rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <CalendarDaysIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm font-medium text-foreground outline-none w-[120px] cursor-pointer"
            />
            <span className="text-muted-foreground/50 text-sm">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-medium text-foreground outline-none w-[120px] cursor-pointer"
            />
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-muted/50 p-1.5 border border-border shadow-sm rounded-xl">
            <button
              onClick={() => setActiveTab("utilization")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200",
                activeTab === "utilization"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <ChartBarIcon className="w-4 h-4" />
              Utilization
            </button>
            <button
              onClick={() => setActiveTab("heatmap")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200",
                activeTab === "heatmap"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <CalendarDaysIcon className="w-4 h-4" />
              Heatmap
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted hover:text-foreground transition-all disabled:opacity-50 shadow-sm active:scale-95"
          >
            <ArrowPathIcon className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Summary strip (utilization view only) ──────────────────────── */}
      {activeTab === "utilization" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <StatPill
            label="Total Employees"
            value={stats.total}
            variant="default"
            icon={UsersIcon}
          />
          <StatPill
            label="Overloaded (>100%)"
            value={stats.overloaded}
            variant="destructive"
            icon={ExclamationTriangleIcon}
          />
          <StatPill
            label="Nearing Limit (75–100%)"
            value={stats.nearing}
            variant="warning"
            icon={ClockIcon}
          />
          <StatPill
            label="Available (<75%)"
            value={stats.normal}
            variant="success"
            icon={CheckCircleIcon}
          />
        </div>
      )}

      {/* ── Content Area ───────────────────────────────────────────────── */}
      <div className="animate-in fade-in duration-500">
        {activeTab === "utilization" ? (
          error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-10 text-center shadow-sm">
              <div className="bg-background rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <ExclamationTriangleIcon className="w-6 h-6 text-destructive" />
              </div>
              <p className="font-bold text-destructive text-lg mb-1">
                Could not load workload data
              </p>
              <p className="text-destructive/80 text-sm max-w-md mx-auto">{error}</p>
              <button 
                onClick={refetch}
                className="mt-4 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[260px] rounded-2xl border border-border/60 bg-card/50 animate-pulse shadow-sm"
                />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border border-border border-dashed bg-muted/30">
              <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No employees found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                No active team members matched your criteria for this period. Try adjusting the date range.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {data.map((item, idx) => (
                <EmployeeCard
                  key={item.employee_id}
                  item={item}
                  index={idx}
                  onOpenDetails={(employee) => {
                    setSelectedEmployee(employee);
                    setIsDrillDownOpen(true);
                  }}
                />
              ))}
            </div>
          )
        ) : (
          /* ── Heatmap Tab ──────────────────────────────────────────────── */
          <div className="space-y-4 animate-in slide-in-from-right-2 duration-500">
            <div className="flex flex-wrap items-center gap-5 text-sm bg-card border border-border px-4 py-3 rounded-xl shadow-sm w-max">
              <span className="font-semibold text-muted-foreground mr-2">Legend:</span>
              {[
                { class: "bg-emerald-500/20 border-emerald-500/40", label: "1–3 tasks (Normal)" },
                { class: "bg-destructive/20 border-destructive/40", label: ">3 tasks (Overloaded)" },
                { class: "bg-muted-foreground/20 border-border", label: "On leave (Unavailable)" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded shadow-sm border", l.class)} />
                  <span className="text-foreground font-medium">{l.label}</span>
                </div>
              ))}
            </div>
            
            <HeatmapView onEmployeeClick={handleHeatmapEmployeeClick} />
          </div>
        )}
      </div>

      <WorkloadDrillDown
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
        employee={selectedEmployee}
        onTaskReassigned={refetch}
      />
    </div>
  );
}
