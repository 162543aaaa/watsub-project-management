import { useMemo, useState } from "react";
import { Plus, TrendingUp, CheckCircle2, AlertCircle, Users, ArrowRight, Clock, TrendingDown, Minus, Video, MapPin, ExternalLink, Calendar, User, Pencil, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useProjects, Task } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useNotifications } from "@/hooks/useNotifications";
import { useMeetings } from "@/hooks/useMeetings";
import { useOnsiteWork } from "@/hooks/useOnsiteWork";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import EmployeeAvatar from "@/components/EmployeeAvatar";

const today = new Date();

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
  "In Progress": { color: "hsl(191 91% 37%)", icon: "▶", bg: "hsl(191 91% 37% / 0.12)" },
  "To Do": { color: "hsl(215 14% 60%)", icon: "○", bg: "hsl(215 14% 60% / 0.12)" },
} as const;

const PRIORITY_CONFIG = {
  High: { color: "hsl(0 84% 55%)", bg: "hsl(0 84% 60% / 0.10)" },
  Medium: { color: "hsl(38 92% 45%)", bg: "hsl(38 92% 50% / 0.10)" },
  Low: { color: "hsl(215 14% 55%)", bg: "hsl(215 14% 60% / 0.10)" },
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
  const { employees, loading: loadingEmployees } = useEmployees();
  const { unreadCount } = useNotifications();
  const { meetings, loading: loadingMeetings } = useMeetings();
  const { onsiteWork, loading: loadingOnsite } = useOnsiteWork();

  const loading = loadingTasks || loadingProjects || loadingCustomers || loadingEmployees || loadingMeetings || loadingOnsite;

  const [empStatusFilter, setEmpStatusFilter] = useState<Record<string, StatusFilter>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);

  const allTasks = useMemo(() => {
    const projectTasks = projects.flatMap(p => p.tasks);
    const customerTasks = customers.flatMap(c => c.tasks);
    return [...standaloneTasks, ...projectTasks, ...customerTasks];
  }, [standaloneTasks, projects, customers]);

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
    }).filter(e => e.total > 0).sort((a, b) => b.progress - a.progress);
  }, [employees, allTasks]);

  const recentTasks = useMemo(() => {
    return [...allTasks]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [allTasks]);

  const donutData = [
    { name: "Done", value: stats.completed, color: "hsl(142 71% 45%)" },
    { name: "In Progress", value: stats.inProgress, color: "hsl(191 91% 37%)" },
    { name: "To Do", value: stats.todo, color: "hsl(215 14% 65%)" },
  ].filter(d => d.value > 0);

  const getTaskSource = (task: Task) => {
    if (task.task_type === "project" && task.project_id) {
      const proj = projects.find(p => p.id === task.project_id);
      return proj ? `Project: ${proj.name}` : "Project";
    }
    if (task.task_type === "customer" && task.customer_id) {
      const cust = customers.find(c => c.id === task.customer_id);
      return cust ? `Customer: ${cust.name}` : "Customer";
    }
    return "Standalone";
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsEditMode(false);
    setEditForm({});
  };

  const enterEditMode = () => {
    if (!selectedTask) return;
    setEditForm({
      name: selectedTask.name,
      status: selectedTask.status,
      priority: selectedTask.priority,
      assigned_to: [...(selectedTask.assigned_to ?? [])],
      start_date: selectedTask.start_date ?? "",
      due_date: selectedTask.due_date ?? "",
      link: selectedTask.link ?? "",
      comments: selectedTask.comments ?? "",
    });
    setIsEditMode(true);
  };

  const handleSaveTask = async () => {
    if (!selectedTask) return;
    setIsSaving(true);
    try {
      const updates = { ...editForm };
      if (selectedTask.task_type === "standalone") {
        await updateStandaloneTask(selectedTask.id, updates);
      } else if (selectedTask.task_type === "project") {
        await updateProjectTask(selectedTask.id, updates);
      } else {
        await updateCustomerTask(selectedTask.id, updates);
      }
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      setIsEditMode(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-7 animate-stagger-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{thaiDate}</p>
        </div>
        <div className="flex gap-2">
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
        <StatCard label="Team Size" value={employees.length} sub={`${projects.length} active projects`} icon={Users} gradient="bg-gradient-warning" trend="neutral" />
        <StatCard label="Meetings" value={meetings.length + allTasks.filter(t => t.category === "meeting").length} sub="การประชุมทั้งหมด" icon={Video} gradient="bg-gradient-to-br from-violet-500 to-purple-600" trend="neutral" />
        <StatCard label="On-site Work" value={onsiteWork.length + allTasks.filter(t => t.category === "onsite").length} sub="งานออกกองทั้งหมด" icon={MapPin} gradient="bg-gradient-to-br from-rose-500 to-pink-600" trend="neutral" />
      </div>

      {/* Team Progress — Full Width */}
      <div className="animate-stagger-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Team Progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{employeeStats.length} members · คลิกงานเพื่อดูรายละเอียด</p>
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
                      style={{ color: emp.progress >= 70 ? "hsl(142 71% 40%)" : emp.progress >= 40 ? "hsl(191 91% 37%)" : "hsl(38 92% 45%)" }}>
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
                        const isOverdue = task.status !== "Done" && task.due_date && new Date(task.due_date) < today;
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors"
                            onClick={() => openTaskDetail(task)}
                          >
                            <span className="text-[11px] flex-shrink-0" style={{ color: cfg.color }}>{cfg.icon}</span>
                            <span className="text-xs text-foreground flex-1 truncate group-hover:text-primary transition-colors">{task.name}</span>
                            {isOverdue && <span className="text-[10px] text-red-400 flex-shrink-0">เกินกำหนด</span>}
                            {task.due_date && !isOverdue && (
                              <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">
                                {new Date(task.due_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                            )}
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

      {/* Recent Tasks + Task Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6 animate-stagger-4">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border/50 p-5 h-full" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Recent Tasks</h2>
              <Link to="/tasks" className="flex items-center gap-1 text-xs font-medium text-primary hover:gap-2 transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No tasks yet</p>
                <Link to="/tasks" className="mt-2 text-xs text-primary font-medium hover:underline">Add your first task →</Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentTasks.map(task => (
                  <div key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-muted/50 cursor-pointer group"
                    onClick={() => openTaskDetail(task)}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{task.name}</div>
                      {task.assigned_to && task.assigned_to.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">
                          {task.assigned_to.slice(0, 2).join(", ")}{task.assigned_to.length > 2 ? ` +${task.assigned_to.length - 2}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {new Date(task.due_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      <span className={task.status === "Done" ? "badge-done" : task.status === "In Progress" ? "badge-progress" : "badge-todo"}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Task Status */}
        <div className="bg-card rounded-2xl border border-border/50 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-base font-semibold text-foreground mb-0.5">Task Status</h2>
          <p className="text-xs text-muted-foreground mb-4">{stats.total} tasks ทั้งหมด</p>

          {stats.total > 0 ? (
            <>
              <div className="relative w-40 h-40 mx-auto mb-5">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-foreground leading-none">{stats.rate}%</span>
                  <span className="text-[11px] text-muted-foreground mt-1">เสร็จแล้ว</span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Done", value: stats.completed, color: STATUS_CONFIG.Done.color, icon: STATUS_CONFIG.Done.icon },
                  { name: "In Progress", value: stats.inProgress, color: STATUS_CONFIG["In Progress"].color, icon: STATUS_CONFIG["In Progress"].icon },
                  { name: "To Do", value: stats.todo, color: STATUS_CONFIG["To Do"].color, icon: STATUS_CONFIG["To Do"].icon },
                ].map(d => {
                  const pct = stats.total ? Math.round((d.value / stats.total) * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: d.color }}>{d.icon}</span>
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{d.value}</span>
                          <span className="text-[10px] text-muted-foreground/60 w-7 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-3 gap-2">
                {[
                  { label: "Projects", value: projects.length },
                  { label: "Customers", value: customers.length },
                  { label: "Pending", value: stats.todo },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-base font-bold text-foreground">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">No data yet</p>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setSelectedTask(null); setIsEditMode(false); }}>
          <div className="bg-card rounded-2xl border border-border/50 w-full max-w-md max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-start justify-between p-5 pb-3 border-b border-border/40">
              <div className="flex-1 pr-3">
                <h3 className="font-semibold text-foreground text-base leading-snug">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.name ?? ""}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:border-primary/50"
                    />
                  ) : selectedTask.name}
                </h3>
                {!isEditMode && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={selectedTask.status === "Done" ? "badge-done" : selectedTask.status === "In Progress" ? "badge-progress" : "badge-todo"}>
                      {selectedTask.status}
                    </span>
                    {selectedTask.priority && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          background: PRIORITY_CONFIG[selectedTask.priority as keyof typeof PRIORITY_CONFIG]?.bg,
                          color: PRIORITY_CONFIG[selectedTask.priority as keyof typeof PRIORITY_CONFIG]?.color,
                        }}>
                        {selectedTask.priority} Priority
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                {!isEditMode && (
                  <button
                    onClick={enterEditMode}
                    title="แก้ไข"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => { setSelectedTask(null); setIsEditMode(false); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* View mode */}
            {!isEditMode ? (
              <div className="p-5 space-y-3.5">
                {/* Assignees */}
                {selectedTask.assigned_to && selectedTask.assigned_to.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Assigned to</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTask.assigned_to.map(name => (
                          <span key={name} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-foreground">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates */}
                {(selectedTask.start_date || selectedTask.due_date) && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex gap-6">
                      {selectedTask.start_date && (
                        <div>
                          <div className="text-[11px] text-muted-foreground">Start</div>
                          <div className="text-xs text-foreground font-medium">
                            {new Date(selectedTask.start_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                          </div>
                        </div>
                      )}
                      {selectedTask.due_date && (
                        <div>
                          <div className="text-[11px] text-muted-foreground">Due</div>
                          <div className="text-xs font-medium" style={{ color: selectedTask.status !== "Done" && new Date(selectedTask.due_date) < today ? "hsl(0 84% 55%)" : "hsl(var(--foreground))" }}>
                            {new Date(selectedTask.due_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                            {selectedTask.status !== "Done" && new Date(selectedTask.due_date) < today && " ⚠"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Source */}
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-[11px] text-muted-foreground">Source</div>
                    <div className="text-xs text-foreground font-medium">{getTaskSource(selectedTask)}</div>
                  </div>
                </div>

                {/* Link */}
                {selectedTask.link && (
                  <div className="flex items-center gap-2.5">
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={selectedTask.link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate"
                      onClick={e => e.stopPropagation()}>
                      {selectedTask.link}
                    </a>
                  </div>
                )}

                {/* Comments */}
                {selectedTask.comments && (
                  <div className="pt-1">
                    <div className="text-[11px] text-muted-foreground mb-1.5">Notes</div>
                    <div className="text-xs text-foreground bg-muted/50 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
                      {selectedTask.comments}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Edit mode form */
              <div className="p-5 space-y-4">
                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">Status</label>
                    <select
                      value={editForm.status ?? "To Do"}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Task["status"] }))}
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option>To Do</option>
                      <option>In Progress</option>
                      <option>Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">Priority</label>
                    <select
                      value={editForm.priority ?? "Medium"}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as Task["priority"] }))}
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>

                {/* Assignees toggle */}
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">ผู้รับงาน</label>
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-muted/50 border border-border/50 max-h-28 overflow-y-auto">
                    {employees.length === 0 ? (
                      <span className="text-xs text-muted-foreground">ไม่มีพนักงาน</span>
                    ) : employees.map(emp => {
                      const isAssigned = (editForm.assigned_to ?? []).includes(emp.name);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => setEditForm(f => ({
                            ...f,
                            assigned_to: isAssigned
                              ? (f.assigned_to ?? []).filter(n => n !== emp.name)
                              : [...(f.assigned_to ?? []), emp.name],
                          }))}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: isAssigned ? STATUS_CONFIG["In Progress"].bg : "transparent",
                            color: isAssigned ? STATUS_CONFIG["In Progress"].color : "hsl(var(--muted-foreground))",
                            border: `1px solid ${isAssigned ? STATUS_CONFIG["In Progress"].color + "40" : "transparent"}`,
                          }}
                        >
                          {isAssigned ? "✓" : "+"} {emp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">วันเริ่ม</label>
                    <input
                      type="date"
                      value={editForm.start_date ?? ""}
                      onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">วันครบกำหนด</label>
                    <input
                      type="date"
                      value={editForm.due_date ?? ""}
                      onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Link */}
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">ลิงก์</label>
                  <input
                    type="text"
                    value={editForm.link ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, link: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">Notes</label>
                  <textarea
                    value={editForm.comments ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, comments: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSaveTask}
                    disabled={isSaving || !editForm.name?.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
