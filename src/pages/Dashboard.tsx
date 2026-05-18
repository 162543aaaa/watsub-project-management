import { useMemo, useState } from "react";
import { Plus, TrendingUp, AlertCircle, Users, ArrowRight, Clock, TrendingDown, Minus, Video, MapPin, BookOpen, RefreshCw, X, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useProjects, Task } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useNotifications } from "@/hooks/useNotifications";
import { useMeetings } from "@/hooks/useMeetings";
import { useOnsiteWork } from "@/hooks/useOnsiteWork";
import { useResourceWorkload } from "@/hooks/useResourceWorkload";
import { useWiki } from "@/hooks/useWiki";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import TaskDetailModal from "@/components/TaskDetailModal";
import { WikiEditor, WikiViewer } from "@/components/WikiEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import LoadingScreen from "@/components/LoadingScreen";

const today = new Date();
const YEARS = [2025, 2026, 2027];

const greeting = (() => {
  const h = today.getHours();
  if (h < 12) return "อรุณสวัสดิ์ 🌅";
  if (h < 17) return "สวัสดีตอนบ่าย ☀️";
  return "สวัสดีตอนเย็น 🌙";
})();

const thaiDate = today.toLocaleDateString("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type StatusFilter = "All" | "Done" | "In Progress" | "To Do";

const STATUS_CONFIG = {
  Done: { color: "hsl(142 71% 45%)", icon: "✓", bg: "hsl(142 71% 45% / 0.12)" },
  "In Progress": { color: "hsl(225 86% 44%)", icon: "▶", bg: "hsl(225 86% 44% / 0.12)" },
  "To Do": { color: "hsl(215 14% 60%)", icon: "○", bg: "hsl(215 14% 60% / 0.12)" },
} as const;

function StatCard({ label, value, sub, icon: Icon, gradient, trend, trendLabel }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-1">
          {trend === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
          {trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
          {trend === "neutral" && <Minus className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      {(sub || trendLabel) && (
        <div className="text-[11px] text-muted-foreground/70 mt-1">{trendLabel || sub}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { tasks: standaloneTasks, loading: loadingTasks, updateTask: updateStandaloneTask } = useTasks();
  const { projects, loading: loadingProjects, updateTask: updateProjectTask } = useProjects();
  const { customers, loading: loadingCustomers, updateTask: updateCustomerTask } = useCustomers();
  const { employees, loading: loadingEmployees, currentEmployee } = useEmployees();
  const { unreadCount } = useNotifications();
  const { meetings, loading: loadingMeetings } = useMeetings();
  const { onsiteWork, loading: loadingOnsite } = useOnsiteWork();

  const loading = loadingTasks || loadingProjects || loadingCustomers || loadingEmployees || loadingMeetings || loadingOnsite;

  const { data: workloadData, loading: loadingWorkload, error: workloadError, refetch: refetchWorkload } = useResourceWorkload();
  const { pages: wikiPages, loading: loadingWiki, createPage } = useWiki();

  const [empStatusFilter, setEmpStatusFilter] = useState<Record<string, StatusFilter>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // Wiki quick-create dialog state
  const [wikiDialogOpen, setWikiDialogOpen] = useState(false);
  const [wikiTitle, setWikiTitle] = useState("");
  const [wikiContent, setWikiContent] = useState("");
  const [wikiCategory, setWikiCategory] = useState("General");
  const [savingWiki, setSavingWiki] = useState(false);
  const [selectedWikiPage, setSelectedWikiPage] = useState<string | null>(null);

  const handleSaveWiki = async () => {
    if (!wikiTitle.trim()) return;
    setSavingWiki(true);
    const slug = wikiTitle
      .toLowerCase()
      .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now();
    await createPage({
      title: wikiTitle.trim(),
      slug,
      content: wikiContent,
      category: wikiCategory,
      author_id: null,
      is_published: true,
    });
    setWikiTitle("");
    setWikiContent("");
    setWikiCategory("General");
    setSavingWiki(false);
    setWikiDialogOpen(false);
  };

  const allTasks = useMemo(() => {
    const projectTasks = projects.filter(p => p.year === filterYear).flatMap(p => p.tasks);
    const customerTasks = customers.filter(c => c.year === filterYear).flatMap(c => c.tasks);
    // Filter standalone tasks by year using start_date/due_date/created_at
    const filteredStandalone = standaloneTasks.filter(t => {
      const dateStr = t.start_date || t.due_date || t.created_at;
      const year = dateStr ? new Date(dateStr).getFullYear() : 2026;
      return year === filterYear;
    });
    return [...filteredStandalone, ...projectTasks, ...customerTasks];
  }, [standaloneTasks, projects, customers, filterYear]);

  const filteredProjects = useMemo(() => projects.filter(p => p.year === filterYear), [projects, filterYear]);
  const filteredCustomers = useMemo(() => customers.filter(c => c.year === filterYear), [customers, filterYear]);

  const stats = useMemo(() => {
    const completed = allTasks.filter(t => t.status === "Done").length;
    const inProgress = allTasks.filter(t => t.status === "In Progress").length;
    const todo = allTasks.filter(t => t.status === "To Do").length;
    const overdue = allTasks.filter(t => t.status !== "Done" && t.due_date && new Date(t.due_date) < today).length;
    const rate = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;
    return { completed, inProgress, todo, overdue, rate, total: allTasks.length };
  }, [allTasks]);

  const employeeStats = useMemo(() => {
    return employees.map(emp => {
      const myTasks = allTasks.filter(t => t.assigned_to?.includes(emp.name) && t.category !== "meeting" && t.category !== "onsite");
      const done = myTasks.filter(t => t.status === "Done").length;
      const inProgress = myTasks.filter(t => t.status === "In Progress").length;
      const todo = myTasks.filter(t => t.status === "To Do").length;
      const progress = myTasks.length ? Math.round((done / myTasks.length) * 100) : 0;
      return { ...emp, total: myTasks.length, done, inProgress, todo, progress, tasks: myTasks };
    }).sort((a, b) => {
      const isACurrent = currentEmployee && a.email?.toLowerCase() === currentEmployee.email?.toLowerCase();
      const isBCurrent = currentEmployee && b.email?.toLowerCase() === currentEmployee.email?.toLowerCase();
      if (isACurrent) return -1;
      if (isBCurrent) return 1;
      return b.progress - a.progress;
    });
  }, [employees, allTasks, currentEmployee]);

  const donutData = [
    { name: "Done", value: stats.completed, color: "hsl(142 71% 45%)" },
    { name: "In Progress", value: stats.inProgress, color: "hsl(225 86% 44%)" },
    { name: "To Do", value: stats.todo, color: "hsl(215 14% 65%)" },
  ].filter(d => d.value > 0);

  const handleSaveTask = async (task: Task, updates: Partial<Task>) => {
    if (task.task_type === "standalone") {
      await updateStandaloneTask(task.id, updates);
    } else if (task.task_type === "project") {
      await updateProjectTask(task.id, updates);
    } else {
      await updateCustomerTask(task.id, updates);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="p-4 sm:p-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-7 animate-stagger-1">
        <div className="flex items-center gap-3.5">
          <div className="flex-shrink-0">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              style={{ imageRendering: "-webkit-optimize-contrast", transform: "translateZ(0)" }}
            >
              <source src="/Eye Animation.webm" type="video/webm" />
            </video>
          </div>
          <div className="h-8 w-[2px] bg-border/80" />
          <div>
            <span className="text-[10px] font-semibold tracking-[0.25em] text-primary uppercase block mb-0.5 animate-pulse">
              Workspace Dashboard
            </span>
            <h1 className="text-sm sm:text-base font-black tracking-[0.15em] text-foreground/85 uppercase leading-none">
              CONNECT. CREATE. INSPIRE.
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1.5">{thaiDate}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 mr-2">
            {YEARS.map(y => (
              <button key={y} onClick={() => setFilterYear(y)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${filterYear === y ? "bg-foreground text-background scale-105" : "bg-muted text-muted-foreground hover:bg-secondary hover:scale-105"}`}>
                {y}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Link to="/notifications" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:scale-105"
              style={{ borderColor: "hsl(0 84% 60% / 0.3)", background: "hsl(0 84% 60% / 0.06)", color: "hsl(0 84% 55%)" }}>
              <AlertCircle className="w-4 h-4" />
              {unreadCount} unread
            </Link>
          )}
          <Link to="/tasks">
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Task
            </button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-5 sm:mb-7 animate-stagger-2">
        <StatCard label="Completion Rate" value={`${stats.rate}%`} sub={`${stats.completed}/${stats.total} tasks`} icon={TrendingUp} gradient="bg-gradient-primary" trend={stats.rate >= 50 ? "up" : "down"} />
        <StatCard label="Active Tasks" value={stats.inProgress} sub="In Progress" icon={Clock} gradient="bg-gradient-success" trend="neutral" />
        <StatCard label="Overdue Tasks" value={stats.overdue} sub="Past due date" icon={AlertCircle} gradient="bg-gradient-danger" trend={stats.overdue > 0 ? "down" : "up"} trendLabel={stats.overdue > 0 ? "Needs attention" : "All on track"} />
        <StatCard label="Team Size" value={employees.length} sub={`${filteredProjects.length} active projects`} icon={Users} gradient="bg-gradient-warning" trend="neutral" />
        <StatCard label="Meetings" value={meetings.length + allTasks.filter(t => t.category === "meeting").length} sub="การประชุมทั้งหมด" icon={Video} gradient="bg-gradient-to-br from-violet-500 to-purple-600" trend="neutral" />
        <StatCard label="On-site Work" value={onsiteWork.length + allTasks.filter(t => t.category === "onsite").length} sub="งานออกกองทั้งหมด" icon={MapPin} gradient="bg-gradient-to-br from-rose-500 to-pink-600" trend="neutral" />
      </div>

      {/* Team Progress — Full Width */}
      <div className="animate-stagger-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Team Progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{employees.length} members · คลิกงานเพื่อดูรายละเอียด</p>
          </div>
          <Link to="/team" className="flex items-center gap-1 text-xs font-medium text-primary hover:gap-2 transition-all">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {employeeStats.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-10 text-center text-muted-foreground text-sm" style={{ boxShadow: "var(--shadow-sm)" }}>
            No team data yet
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {employeeStats.map((emp, idx) => {
              const filter = empStatusFilter[emp.id] ?? "To Do";
              const filteredTasks = filter === "All" ? emp.tasks : emp.tasks.filter(t => t.status === filter);

              return (
                <div key={emp.id} className="bg-card rounded-2xl border border-border/50 p-4 flex flex-col gap-3" style={{ boxShadow: "var(--shadow-sm)" }}>
                  {/* Employee header */}
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar name={emp.name} avatar={emp.avatar} size="md" index={idx} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{emp.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium" style={{ color: STATUS_CONFIG.Done.color }}>✓ {emp.done}</span>
                        <span className="text-[11px] font-medium" style={{ color: STATUS_CONFIG["In Progress"].color }}>▶ {emp.inProgress}</span>
                        <span className="text-[11px]" style={{ color: STATUS_CONFIG["To Do"].color }}>○ {emp.todo}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0"
                      style={{ color: emp.progress >= 70 ? "hsl(142 71% 40%)" : emp.progress >= 40 ? "hsl(225 86% 44%)" : "hsl(38 92% 45%)" }}>
                      {emp.progress}%
                    </span>
                  </div>

                  {/* Unified progress bar */}
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${emp.progress}%` }} />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(["All", "Done", "In Progress", "To Do"] as StatusFilter[]).map(f => {
                      const isActive = filter === f;
                      const count = f === "All" ? emp.total : f === "Done" ? emp.done : f === "In Progress" ? emp.inProgress : emp.todo;
                      const cfg = f !== "All" ? STATUS_CONFIG[f] : null;
                      return (
                        <button
                          key={f}
                          onClick={() => setEmpStatusFilter(prev => ({ ...prev, [emp.id]: f }))}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                          style={{
                            background: isActive ? (cfg?.bg ?? "hsl(var(--primary) / 0.12)") : "transparent",
                            color: isActive ? (cfg?.color ?? "hsl(var(--primary))") : "hsl(var(--muted-foreground))",
                            border: `1px solid ${isActive ? (cfg?.color ?? "hsl(var(--primary))") + "50" : "transparent"}`,
                          }}
                        >
                          {f === "All" ? `All (${count})` : `${cfg!.icon} ${f === "In Progress" ? "In Prog." : f} (${count})`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Task list */}
                  <div className="flex-1 max-h-48 overflow-y-auto space-y-0.5 -mx-1 px-1">
                    {filteredTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">ไม่มีงานในสถานะนี้</p>
                    ) : (
                      filteredTasks.map(task => {
                        const cfg = STATUS_CONFIG[task.status];
                        const dueDateObj = task.due_date ? new Date(task.due_date) : null;
                        let deadlineBadge: React.ReactNode = null;
                        if (dueDateObj && task.status !== "Done") {
                          const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                          const dueMs = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate()).getTime();
                          const diffDays = Math.floor((dueMs - todayMs) / (1000 * 60 * 60 * 24));
                          if (diffDays < 0) {
                            deadlineBadge = <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 animate-pulse" style={{ background: "hsl(0 84% 60% / 0.12)", color: "hsl(0 84% 50%)" }}>เกิน {Math.abs(diffDays)} วัน</span>;
                          } else if (diffDays <= 5) {
                            deadlineBadge = <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 92% 40%)" }}>อีก {diffDays} วัน</span>;
                          } else {
                            deadlineBadge = <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">{dueDateObj.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>;
                          }
                        }
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors"
                            onClick={() => setSelectedTask(task)}
                          >
                            <span className="text-[11px] flex-shrink-0" style={{ color: cfg.color }}>{cfg.icon}</span>
                            <span className="text-xs text-foreground flex-1 truncate group-hover:text-primary transition-colors">{task.name}</span>
                            <span className={task.status === "Done" ? "badge-done" : task.status === "In Progress" ? "badge-progress" : "badge-todo"} style={{ fontSize: "9px", padding: "1px 6px" }}>{task.status}</span>
                            {deadlineBadge}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

      {/* Task Status — Full Width Bottom */}
      <div className="mt-5 bg-card rounded-2xl border border-border/50 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        {stats.total === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Donut chart */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground leading-none">{stats.rate}%</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">เสร็จแล้ว</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{stats.total} tasks ทั้งหมด</p>
            </div>

            {/* Status bars + mini counts */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Task Status</h2>
                <div className="flex items-center gap-4">
                  {[
                    { label: "Projects", value: filteredProjects.length },
                    { label: "Customers", value: filteredCustomers.length },
                    { label: "Overdue", value: stats.overdue },
                  ].map(s => (
                    <div key={s.label} className="text-center hidden sm:block">
                      <div className="text-sm font-bold text-foreground">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { name: "Done", value: stats.completed, color: STATUS_CONFIG.Done.color, icon: STATUS_CONFIG.Done.icon },
                  { name: "In Progress", value: stats.inProgress, color: STATUS_CONFIG["In Progress"].color, icon: STATUS_CONFIG["In Progress"].icon },
                  { name: "To Do", value: stats.todo, color: STATUS_CONFIG["To Do"].color, icon: STATUS_CONFIG["To Do"].icon },
                ].map(d => {
                  const pct = stats.total ? Math.round((d.value / stats.total) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-24 flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[11px]" style={{ color: d.color }}>{d.icon}</span>
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                      </div>
                      <div className="progress-bar flex-1">
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                      <div className="flex items-center gap-1.5 w-14 flex-shrink-0 text-right justify-end">
                        <span className="text-xs font-semibold text-foreground">{d.value}</span>
                        <span className="text-[10px] text-muted-foreground/60">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────
          Resource Workload Panel
      ────────────────────────────────────────────────────── */}
      <div className="mt-5 animate-stagger-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Resource Workload</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Active tasks per team member (next 30 days)</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/workload"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs hover:bg-muted transition-colors"
            >
              View Resource Workload
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={refetchWorkload}
              disabled={loadingWorkload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingWorkload ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {workloadError ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
            <p className="text-xs font-semibold text-destructive mb-1">Could not load workload data</p>
            <p className="text-xs text-muted-foreground">{workloadError}</p>
          </div>
        ) : loadingWorkload ? (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3 animate-pulse" style={{ boxShadow: "var(--shadow-sm)" }}>
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded-lg" />)}
          </div>
        ) : workloadData.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground" style={{ boxShadow: "var(--shadow-sm)" }}>
            No workload data available
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="space-y-3">
              {(() => {
                const maxTasks = Math.max(...workloadData.map(w => w.active_tasks_count), 1);
                return workloadData.map(w => {
                  const pct = Math.round((w.active_tasks_count / maxTasks) * 100);
                  const isHeavy = w.active_tasks_count > 3;
                  const barColor = isHeavy
                    ? "hsl(0 84% 60%)"
                    : w.active_tasks_count > 0
                    ? "hsl(225 86% 44%)"
                    : "hsl(215 14% 60%)";
                  return (
                    <div key={w.employee_id} className="flex items-center gap-3">
                      <div className="w-28 sm:w-36 text-xs text-foreground truncate flex-shrink-0 font-medium">
                        {w.employee_name}
                      </div>
                      <div className="progress-bar flex-1">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 w-20 justify-end flex-shrink-0">
                        <span
                          className="text-xs font-bold"
                          style={{ color: barColor }}
                        >
                          {w.active_tasks_count}
                        </span>
                        <span className="text-[10px] text-muted-foreground">tasks</span>
                        {isHeavy && (
                          <span className="text-[9px] font-semibold px-1 py-0.5 rounded"
                            style={{ background: "hsl(0 84% 60% / 0.12)", color: "hsl(0 84% 55%)" }}>
                            HEAVY
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-3 text-right">
              Red bar = overloaded (&gt;3 active tasks)
            </p>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────
          Company Wiki Quick Panel
      ────────────────────────────────────────────────────── */}
      <div className="mt-5 animate-stagger-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Company Wiki</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Knowledge base articles</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/wiki" className="flex items-center gap-1 text-xs font-medium text-primary hover:gap-2 transition-all">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={() => setWikiDialogOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Article
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
          {loadingWiki ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded-lg" />)}
            </div>
          ) : wikiPages.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No articles yet</p>
              <button
                onClick={() => setWikiDialogOpen(true)}
                className="btn-primary text-xs px-3 py-1.5"
              >
                Create first article
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Show latest 5 articles */}
              {wikiPages.slice(0, 5).map(page => (
                <div
                  key={page.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors"
                  onClick={() => setSelectedWikiPage(selectedWikiPage === page.id ? null : page.id)}
                >
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                      {page.title}
                    </span>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      background: "hsl(215 20% 45% / 0.12)",
                      color: "hsl(215 20% 65%)",
                    }}
                  >
                    {page.category}
                  </span>
                </div>
              ))}
              {/* Inline preview of selected article */}
              {selectedWikiPage && (() => {
                const page = wikiPages.find(p => p.id === selectedWikiPage);
                if (!page) return null;
                return (
                  <div className="mt-2 p-3 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground">{page.title}</span>
                      <button
                        onClick={() => setSelectedWikiPage(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <WikiViewer
                      htmlContent={page.content ?? ""}
                      className="text-xs max-h-32 overflow-y-auto"
                    />
                    <Link
                      to={`/wiki/${page.slug}`}
                      className="text-[11px] text-primary hover:underline mt-1.5 block"
                    >
                      Read full article →
                    </Link>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────
          Wiki Create Dialog
      ────────────────────────────────────────────────────── */}
      <Dialog open={wikiDialogOpen} onOpenChange={setWikiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4" />
              New Wiki Article
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <input
                type="text"
                value={wikiTitle}
                onChange={e => setWikiTitle(e.target.value)}
                placeholder="Article title…"
                className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            {/* Category */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select
                value={wikiCategory}
                onChange={e => setWikiCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              >
                {["General", "HR", "IT", "Operations", "Finance"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {/* Rich text editor */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
              <WikiEditor
                initialContent=""
                onChange={setWikiContent}
                className="min-h-[200px]"
              />
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setWikiDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWiki}
                disabled={savingWiki || !wikiTitle.trim()}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {savingWiki ? "Saving…" : "Publish Article"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDetailModal
        isOpen={!!selectedTask}
        task={selectedTask}
        employees={employees}
        onClose={() => setSelectedTask(null)}
        onSave={handleSaveTask}
      />
    </div>
  );
}
