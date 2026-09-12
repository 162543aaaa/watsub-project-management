import { ArrowPathIcon, ArrowRightIcon, ArrowTrendingUpIcon, BookOpenIcon, ClockIcon, ExclamationCircleIcon, MapPinIcon, PaperAirplaneIcon, PlusIcon, UsersIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { lazy, Suspense, useMemo, useState } from "react";
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
import EmployeeAvatar from "@/components/EmployeeAvatar";
import EditTaskModal from "@/components/EditTaskModal";
import WikiViewer from "@/components/WikiViewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoadingScreen from "@/components/LoadingScreen";

const today = new Date();
const YEARS = [2025, 2026, 2027];

const WikiEditor = lazy(() => import("@/components/WikiEditor"));
const TaskStatusDonut = lazy(() => import("@/components/TaskStatusDonut"));

const thaiDate = today.toLocaleDateString("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type StatusFilter = "All" | "Done" | "In Progress" | "To Do";

const STATUS_CONFIG = {
  Done: { color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.12)" },
  "In Progress": { color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.12)" },
  "To Do": { color: "hsl(var(--status-todo))", bg: "hsl(var(--status-todo) / 0.12)" },
} as const;

function MetricCard({ label, value, sub, icon: Icon, tone = "neutral" }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "info" | "success" | "danger" | "accent";
}) {
  const toneClass = {
    neutral: "bg-muted text-foreground",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    accent: "bg-secondary text-secondary-foreground",
  }[tone];

  return (
    <div className="ops-metric-card">
      <div className={`ops-metric-icon ${toneClass}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-5 text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{label}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { tasks: standaloneTasks, loading: loadingTasks, updateTask: updateStandaloneTask } = useTasks();
  const { projects, loading: loadingProjects, updateTask: updateProjectTask } = useProjects("all");
  const { customers, loading: loadingCustomers, updateTask: updateCustomerTask } = useCustomers("all");
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

  const filteredProjects = useMemo(() => projects.filter(p => p.year === filterYear && !p.is_archived), [projects, filterYear]);
  const filteredCustomers = useMemo(() => customers.filter(c => c.year === filterYear && !c.is_archived), [customers, filterYear]);

  const stats = useMemo(() => {
    const completed = allTasks.filter(t => t.status === "Done").length;
    const inProgress = allTasks.filter(t => t.status === "In Progress").length;
    const todo = allTasks.filter(t => t.status === "To Do").length;
    const overdue = allTasks.filter(t => t.status !== "Done" && t.due_date && new Date(t.due_date) < today).length;
    const rate = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;
    return { completed, inProgress, todo, overdue, rate, total: allTasks.length };
  }, [allTasks]);

  const employeeStats = useMemo(() => {
    return employees.filter(emp => !emp.is_archived).map(emp => {
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
    { name: "Done", value: stats.completed, color: "hsl(var(--success))" },
    { name: "In Progress", value: stats.inProgress, color: "hsl(var(--info))" },
    { name: "To Do", value: stats.todo, color: "hsl(var(--status-todo))" },
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
      <section className="ops-dashboard-hero animate-stagger-1">
        <div className="min-w-0">
          <p className="ops-kicker">Creative operations</p>
          <h1 className="ops-display">CONNECT. CREATE. INSPIRE.</h1>
          <p className="mt-2 text-sm text-muted-foreground">{thaiDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="ops-year-switcher" aria-label="Filter dashboard by year">
            {YEARS.map(y => (
              <button key={y} onClick={() => setFilterYear(y)}
                className={filterYear === y ? "is-active" : ""} aria-pressed={filterYear === y}>
                {y}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Link to="/notifications" className="ops-alert-link">
              <ExclamationCircleIcon className="h-4 w-4" />
              {unreadCount} unread
            </Link>
          )}
          <Link to="/tasks" className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-4 w-4" /> New Task
          </Link>
        </div>
      </section>

      {/* Operational snapshot */}
      <section className="ops-snapshot animate-stagger-2" aria-label="Operational snapshot">
        <div className="ops-lead-metric">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ops-kicker">Completion rate</p>
              <div className="mt-4 text-6xl font-bold tracking-[-0.06em] text-foreground tabular-nums sm:text-7xl">{stats.rate}%</div>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                {stats.completed} of {stats.total} tasks completed in {filterYear}.
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-6 w-6 text-primary-readable" />
          </div>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${stats.rate}%` }} />
          </div>
        </div>
        <div className="ops-metric-grid">
          <MetricCard label="Active tasks" value={stats.inProgress} sub="Currently in progress" icon={ClockIcon} tone="info" />
          <MetricCard label="Overdue" value={stats.overdue} sub={stats.overdue > 0 ? "Needs attention" : "All on track"} icon={ExclamationCircleIcon} tone={stats.overdue > 0 ? "danger" : "success"} />
          <MetricCard label="Team" value={employees.length} sub={`${filteredProjects.length} active projects`} icon={UsersIcon} tone="accent" />
          <MetricCard label="Field activity" value={meetings.length + onsiteWork.length + allTasks.filter(t => t.category === "meeting" || t.category === "onsite").length} sub="Meetings and on-site work" icon={MapPinIcon} />
        </div>
      </section>

      {/* Team Progress - Full Width */}
      <div className="animate-stagger-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Team Progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{employees.length} members · คลิกงานเพื่อดูรายละเอียด</p>
          </div>
          <Link to="/team" className="flex items-center gap-1 text-xs font-medium text-primary-readable hover:gap-2 transition-all">
            View all <ArrowRightIcon className="w-3 h-3" />
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
                        <span className="text-[11px] font-medium" style={{ color: STATUS_CONFIG.Done.color }}>Done {emp.done}</span>
                        <span className="text-[11px] font-medium" style={{ color: STATUS_CONFIG["In Progress"].color }}>Active {emp.inProgress}</span>
                        <span className="text-[11px]" style={{ color: STATUS_CONFIG["To Do"].color }}>To do {emp.todo}</span>
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${emp.progress >= 70 ? "text-success" : emp.progress >= 40 ? "text-info" : "text-warning-foreground"}`}>
                      {emp.progress}%
                    </span>
                  </div>

                  {/* Stacked progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full transition-all duration-700 ease-out" style={{ width: `${emp.total ? (emp.done / emp.total) * 100 : 0}%`, background: STATUS_CONFIG.Done.color }} />
                    <div className="h-full transition-all duration-700 ease-out" style={{ width: `${emp.total ? (emp.inProgress / emp.total) * 100 : 0}%`, background: STATUS_CONFIG["In Progress"].color }} />
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
                          {f === "All" ? `All (${count})` : `${f === "In Progress" ? "In Prog." : f} (${count})`}
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
                        } // Restore missing brace
                        
                        let contextName = "";
                        if (task.task_type === 'project') {
                          contextName = projects.find(p => p.id === task.project_id)?.name || "Project";
                        } else if (task.task_type === 'customer') {
                          contextName = customers.find(c => c.id === task.customer_id)?.name || "Customer";
                        }

                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors"
                            onClick={() => setSelectedTask(task)}
                            role="button"
                            tabIndex={0}
                            aria-label={`เปิดงาน ${task.name}`}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedTask(task);
                              }
                            }}
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: cfg.color }} aria-hidden="true" />
                            <div className="flex-1 min-w-0 flex flex-col">
                              <span className="text-xs text-foreground truncate group-hover:text-primary-readable transition-colors">{task.name}</span>
                              {contextName && <span className="text-[9px] text-muted-foreground truncate">{contextName}</span>}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={task.status === "Done" ? "badge-done" : task.status === "In Progress" ? "badge-progress" : "badge-todo"} style={{ fontSize: "9px", padding: "1px 6px" }}>{task.status}</span>
                              {deadlineBadge}
                            </div>
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

      {/* Task Status - Full Width Bottom */}
      <div className="mt-5 bg-card rounded-2xl border border-border/50 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        {stats.total === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Donut chart */}
            <Suspense fallback={<div role="status" aria-label="กำลังโหลดกราฟสถานะงาน" className="mx-auto h-28 w-28 flex-shrink-0 rounded-full bg-muted/50 sm:mx-0" />}>
              <TaskStatusDonut data={donutData} rate={stats.rate} total={stats.total} />
            </Suspense>

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
                  { name: "Done", value: stats.completed, color: STATUS_CONFIG.Done.color },
                  { name: "In Progress", value: stats.inProgress, color: STATUS_CONFIG["In Progress"].color },
                  { name: "To Do", value: stats.todo, color: STATUS_CONFIG["To Do"].color },
                ].map(d => {
                  const pct = stats.total ? Math.round((d.value / stats.total) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-24 flex items-center gap-1.5 flex-shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
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
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
            <button
              onClick={refetchWorkload}
              disabled={loadingWorkload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs hover:bg-muted transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-3 h-3 ${loadingWorkload ? "animate-spin" : ""}`} />
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
                    ? "hsl(var(--destructive))"
                    : w.active_tasks_count > 0
                    ? "hsl(var(--info))"
                    : "hsl(var(--status-todo))";
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
                            style={{ background: "hsl(0 84% 60% / 0.12)", color: "hsl(var(--destructive))" }}>
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
            <Link to="/wiki" className="flex items-center gap-1 text-xs font-medium text-primary-readable hover:gap-2 transition-all">
              View all <ArrowRightIcon className="w-3 h-3" />
            </Link>
            <button
              onClick={() => setWikiDialogOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
            >
              <PlusIcon className="w-3.5 h-3.5" /> New Article
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
              <BookOpenIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
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
                  role="button"
                  tabIndex={0}
                  aria-expanded={selectedWikiPage === page.id}
                  aria-label={`${selectedWikiPage === page.id ? "ปิด" : "เปิด"}บทความ ${page.title}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedWikiPage(selectedWikiPage === page.id ? null : page.id);
                    }
                  }}
                >
                  <BookOpenIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground group-hover:text-primary-readable transition-colors truncate block">
                      {page.title}
                    </span>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      background: "hsl(var(--muted))",
                      color: "hsl(var(--muted-foreground))",
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
                        type="button"
                        onClick={() => setSelectedWikiPage(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="ปิดตัวอย่างบทความ"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <WikiViewer
                      htmlContent={page.content ?? ""}
                      className="text-xs max-h-32 overflow-y-auto"
                    />
                    <Link
                      to={`/wiki/${page.slug}`}
                      className="text-[11px] text-primary-readable hover:underline mt-1.5 block"
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
              <BookOpenIcon className="w-4 h-4" />
              New Wiki Article
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Title */}
            <div>
              <label htmlFor="wiki-title" className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <input
                id="wiki-title"
                type="text"
                value={wikiTitle}
                onChange={e => setWikiTitle(e.target.value)}
                placeholder="Article title…"
                className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              />
            </div>
            {/* Category */}
            <div>
              <label htmlFor="wiki-category" className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select
                id="wiki-category"
                value={wikiCategory}
                onChange={e => setWikiCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                {["General", "HR", "IT", "Operations", "Finance"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {/* Rich text editor */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
              <Suspense fallback={<div role="status" className="min-h-48 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">กำลังโหลดตัวแก้ไข...</div>}>
                <WikiEditor
                  initialContent=""
                  onChange={setWikiContent}
                  className="min-h-[200px]"
                />
              </Suspense>
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
                <PaperAirplaneIcon className="w-3.5 h-3.5" />
                {savingWiki ? "Saving…" : "Publish Article"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditTaskModal
        isOpen={!!selectedTask}
        task={selectedTask}
        employees={employees}
        projects={projects}
        customers={customers}
        onClose={() => setSelectedTask(null)}
        onSave={async (updates) => { if (selectedTask) await handleSaveTask(selectedTask, updates); }}
      />
    </div>
  );
}
