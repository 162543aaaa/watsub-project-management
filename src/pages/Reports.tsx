import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Users, CheckCircle2, AlertCircle, FolderOpen, Clock,
  Trophy, TrendingUp, Download, FileText, Sheet
} from "lucide-react";

type Task = {
  id: string; name: string; status: string; priority: string;
  due_date?: string | null; assigned_to: string[]; task_type: string;
  project_id?: string | null; customer_id?: string | null;
};
type Employee = { id: string; name: string };
type LeaveRequest = { id: string; status: string };

const YEARS = [2025, 2026, 2027];
const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const today = new Date();
const gradients = ["from-cyan-400 to-teal-500", "from-violet-400 to-purple-500", "from-rose-400 to-pink-500", "from-amber-400 to-orange-500", "from-blue-400 to-indigo-500"];

// ---- CSV export helper ----
function exportCSV(rows: string[][], filename: string) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---- PDF export via print ----
function exportPDF(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html><head><title>${filename}</title>
    <style>
      body { font-family: sans-serif; font-size: 13px; color: #1a1a1a; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      p { color: #666; margin-bottom: 16px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { background: #f0f0f0; text-align: left; padding: 8px 12px; font-size: 12px; }
      td { padding: 7px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
      .section { margin-bottom: 28px; }
      .section-title { font-size: 15px; font-weight: 700; margin-bottom: 10px; }
      .stat-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
      .stat { background: #f8f8f8; border-radius: 8px; padding: 12px 18px; min-width: 120px; }
      .stat-val { font-size: 22px; font-weight: 700; }
      .stat-lbl { font-size: 11px; color: #888; }
      .bar-wrap { background: #eee; border-radius: 99px; height: 8px; margin-top: 4px; }
      .bar { background: #6366f1; border-radius: 99px; height: 8px; }
    </style></head><body>
    ${el.innerHTML}
    </body></html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
}

export default function Reports() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(2026);
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [tasksRes, empsRes, leavesRes, projsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("employees").select("id, name"),
        supabase.from("leave_requests").select("id, status"),
        supabase.from("projects").select("id"),
      ]);
      setTasks((tasksRes.data || []) as Task[]);
      setEmployees((empsRes.data || []) as Employee[]);
      setLeaveRequests((leavesRes.data || []) as LeaveRequest[]);
      setProjectCount((projsRes.data || []).length);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Tasks filtered by year+month for the stats/distribution/overdue cards
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.due_date) return filterMonth === "all";
      const d = new Date(t.due_date);
      const yearMatch = d.getFullYear() === filterYear;
      const monthMatch = filterMonth === "all" || (d.getMonth() + 1) === filterMonth;
      return yearMatch && monthMatch;
    });
  }, [tasks, filterYear, filterMonth]);

  // Top Performers use ALL tasks (no date filter) so no one is missed
  const allTasksForPerformers = tasks;

  const allTasks = filteredTasks;

  const stats = [
    { label: "Total Tasks", value: allTasks.length, icon: BarChart3, color: "bg-gradient-primary" },
    { label: "Completed", value: allTasks.filter(t => t.status === "Done").length, icon: CheckCircle2, color: "bg-gradient-success" },
    { label: "Overdue", value: allTasks.filter(t => t.status !== "Done" && t.due_date && new Date(t.due_date) < today).length, icon: AlertCircle, color: "bg-gradient-danger" },
    { label: "Active Projects", value: projectCount, icon: FolderOpen, color: "bg-gradient-warning" },
    { label: "Total Employees", value: employees.length, icon: Users, color: "bg-gradient-primary" },
    { label: "Pending Leave", value: leaveRequests.filter(l => l.status === "Pending").length, icon: Clock, color: "bg-gradient-warning" },
  ];

  // Top Performers: based on ALL tasks, no date restriction
  const topPerformers = useMemo(() => employees.map(emp => {
    const myTasks = allTasksForPerformers.filter(t => t.assigned_to.includes(emp.name));
    const done = myTasks.filter(t => t.status === "Done").length;
    return { ...emp, total: myTasks.length, done, pct: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 };
  }).filter(e => e.total > 0).sort((a, b) => b.pct - a.pct || b.done - a.done), [employees, allTasksForPerformers]);

  const taskDist = [
    { label: "To Do", count: allTasks.filter(t => t.status === "To Do").length, color: "bg-muted-foreground" },
    { label: "In Progress", count: allTasks.filter(t => t.status === "In Progress").length, color: "bg-primary" },
    { label: "Done", count: allTasks.filter(t => t.status === "Done").length, color: "bg-green-500" },
  ];

  const overdueTasks = allTasks.filter(t => t.status !== "Done" && t.due_date && new Date(t.due_date) < today);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    tasks.forEach(t => {
      if (t.due_date) {
        const d = new Date(t.due_date);
        if (d.getFullYear() === filterYear) months.add(d.getMonth() + 1);
      }
    });
    return [...months].sort();
  }, [tasks, filterYear]);

  // --- Export handlers ---
  const periodLabel = filterMonth === "all" ? `${filterYear}` : `${monthNames[filterMonth]} ${filterYear}`;

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const rows: string[][] = [
      ["Report: Team & Project Analytics", periodLabel, "", "", ""],
      [],
      ["=== STATS ==="],
      ["Metric", "Value"],
      ...stats.map(s => [s.label, String(s.value)]),
      [],
      ["=== TOP PERFORMERS (All Tasks) ==="],
      ["Rank", "Name", "Done", "Total Tasks", "Completion %"],
      ...topPerformers.slice(0, 10).map((e, i) => [String(i + 1), e.name, String(e.done), String(e.total), `${e.pct}%`]),
      [],
      ["=== TASK DISTRIBUTION ==="],
      ["Status", "Count", "Percentage"],
      ...taskDist.map(d => [d.label, String(d.count), allTasks.length ? `${Math.round((d.count / allTasks.length) * 100)}%` : "0%"]),
      [],
      ["=== OVERDUE TASKS ==="],
      ["Task Name", "Due Date", "Priority"],
      ...overdueTasks.map(t => [t.name, t.due_date || "-", t.priority]),
    ];
    exportCSV(rows, `reports-${periodLabel.replace(/ /g, "-")}.csv`);
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const statsHtml = stats.map(s => `<div class="stat"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`).join("");
    const perfHtml = topPerformers.slice(0, 8).map((e, i) =>
      `<tr><td>#${i + 1}</td><td>${e.name}</td><td>${e.done}/${e.total}</td><td>${e.pct}%</td>
       <td><div class="bar-wrap"><div class="bar" style="width:${e.pct}%"></div></div></td></tr>`
    ).join("");
    const distHtml = taskDist.map(d =>
      `<tr><td>${d.label}</td><td>${d.count}</td><td>${allTasks.length ? Math.round((d.count / allTasks.length) * 100) : 0}%</td>
       <td><div class="bar-wrap"><div class="bar" style="width:${allTasks.length ? (d.count / allTasks.length) * 100 : 0}%"></div></div></td></tr>`
    ).join("");
    const overdueHtml = overdueTasks.slice(0, 10).map(t =>
      `<tr><td>${t.name}</td><td>${t.due_date ? new Date(t.due_date).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td><td>${t.priority}</td></tr>`
    ).join("");

    printWindow.document.write(`<html><head><title>Reports – ${periodLabel}</title>
    <style>
      body{font-family:sans-serif;font-size:13px;color:#1a1a1a;padding:32px;max-width:900px;margin:0 auto;}
      h1{font-size:22px;margin-bottom:2px;} .sub{color:#888;font-size:12px;margin-bottom:24px;}
      .stat-row{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;}
      .stat{background:#f5f5f5;border-radius:10px;padding:14px 20px;min-width:110px;}
      .stat-val{font-size:24px;font-weight:700;} .stat-lbl{font-size:11px;color:#888;margin-top:2px;}
      .section-title{font-size:15px;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #eee;padding-bottom:6px;}
      table{width:100%;border-collapse:collapse;margin-bottom:8px;}
      th{background:#f0f0f0;text-align:left;padding:8px 12px;font-size:12px;font-weight:600;}
      td{padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;}
      .bar-wrap{background:#e5e7eb;border-radius:99px;height:7px;min-width:80px;}
      .bar{background:#6366f1;border-radius:99px;height:7px;}
      .note{font-size:11px;color:#aaa;margin-top:4px;}
    </style></head><body>
    <h1>Reports – ${periodLabel}</h1>
    <div class="sub">Generated ${new Date().toLocaleString("en")}</div>
    <div class="stat-row">${statsHtml}</div>
    <div class="section-title">🏆 Top Performers <span style="font-size:11px;font-weight:400;color:#888">(All Tasks)</span></div>
    <table><thead><tr><th>Rank</th><th>Name</th><th>Done/Total</th><th>%</th><th>Progress</th></tr></thead><tbody>${perfHtml || '<tr><td colspan="5" style="color:#aaa;text-align:center;padding:16px">No data</td></tr>'}</tbody></table>
    <div class="section-title">📊 Task Distribution (${periodLabel})</div>
    <table><thead><tr><th>Status</th><th>Count</th><th>%</th><th>Bar</th></tr></thead><tbody>${distHtml}</tbody></table>
    <div class="section-title">⚠️ Overdue Tasks (${periodLabel})</div>
    <table><thead><tr><th>Task</th><th>Due Date</th><th>Priority</th></tr></thead><tbody>${overdueHtml || '<tr><td colspan="3" style="color:green;text-align:center;padding:16px">No overdue tasks 🎉</td></tr>'}</tbody></table>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Team & project analytics overview</p>
        </div>
        {/* Export button */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-muted transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden animate-scale-in">
              <button onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left">
                <Sheet className="w-4 h-4 text-green-600" /> Export CSV
              </button>
              <div className="h-px bg-border" />
              <button onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left">
                <FileText className="w-4 h-4 text-red-500" /> Export PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Year + Month Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-stagger-2">
        <div className="flex gap-1">
          {YEARS.map(y => (
            <button key={y} onClick={() => { setFilterYear(y); setFilterMonth("all"); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filterYear === y ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              {y}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <button onClick={() => setFilterMonth("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterMonth === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
          All months
        </button>
        {availableMonths.map(m => (
          <button key={m} onClick={() => setFilterMonth(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterMonth === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {monthNames[m]?.slice(0, 3)}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{allTasks.length} tasks in view</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-stagger-3">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color} mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Performers — ALL tasks, no date filter */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 animate-stagger-4" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-foreground">Top Performers</h2>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">All tasks</span>
          </div>
          {topPerformers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No assigned tasks yet</p>
          ) : (
            <div className="space-y-4">
              {topPerformers.slice(0, 5).map((emp, i) => (
                <div key={emp.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.done}/{emp.total} tasks done</div>
                    </div>
                    <span className="text-sm font-bold text-primary">{emp.pct}%</span>
                  </div>
                  <div className="progress-bar ml-7"><div className="progress-fill" style={{ width: `${emp.pct}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Distribution */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 animate-stagger-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Task Distribution</h2>
          </div>
          <div className="space-y-4">
            {taskDist.map(d => (
              <div key={d.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground font-medium">{d.label}</span>
                  <span className="font-bold text-foreground">{d.count} <span className="font-normal text-muted-foreground text-xs">tasks</span></span>
                </div>
                <div className="progress-bar">
                  <div className={`h-full rounded-full transition-all duration-700 ${d.color}`}
                    style={{ width: `${allTasks.length ? (d.count / allTasks.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient-primary">
                {allTasks.length ? Math.round((allTasks.filter(t => t.status === "Done").length / allTasks.length) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Overall completion rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Analysis */}
      <div className="bg-card rounded-2xl border border-border/60 p-5 animate-stagger-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-bold text-foreground mb-4">Overdue Analysis</h2>
        <div className="space-y-2">
          {overdueTasks.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1 truncate">{t.name}</span>
              <span className="text-xs text-red-500 font-semibold flex-shrink-0">
                Due {new Date(t.due_date!).toLocaleDateString("en", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
          {overdueTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No overdue tasks 🎉</p>
          )}
          {overdueTasks.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">+{overdueTasks.length - 5} more overdue tasks</p>
          )}
        </div>
      </div>
    </div>
  );
}
