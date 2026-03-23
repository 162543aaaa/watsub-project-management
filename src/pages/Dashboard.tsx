import { useMemo, useState } from "react";
import { Plus, TrendingUp, CheckCircle2, AlertCircle, Users, ArrowRight, Clock, TrendingDown, Minus, Video, MapPin, ExternalLink, Calendar, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useProjects, Task } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useNotifications } from "@/hooks/useNotifications";
import { useMeetings } from "@/hooks/useMeetings";
import { useOnsiteWork } from "@/hooks/useOnsiteWork";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import EmployeeAvatar from "@/components/EmployeeAvatar";

const today = new Date();

type StatusFilter = "All" | "Done" | "In Progress" | "To Do";

const STATUS_CONFIG = {
  Done: { color: "hsl(142 71% 45%)", icon: "✓", bg: "hsl(142 71% 45% / 0.12)" },
  "In Progress": { color: "hsl(191 91% 37%)", icon: "▶", bg: "hsl(191 91% 37% / 0.12)" },
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
  const { tasks: standaloneTasks, loading: loadingTasks } = useTasks();
  const { projects, loading: loadingProjects } = useProjects();
  const { customers, loading: loadingCustomers } = useCustomers();
  const { employees, loading: loadingEmployees } = useEmployees();
  const { unreadCount } = useNotifications();
  const { meetings, loading: loadingMeetings } = useMeetings();
  const { onsiteWork, loading: loadingOnsite } = useOnsiteWork();

  const loading = loadingTasks || loadingProjects || loadingCustomers || loadingEmployees || loadingMeetings || loadingOnsite;

  const [empStatusFilter, setEmpStatusFilter] = useState<Record<string, StatusFilter>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
    { name: "To Do", value: stats.todo, color: "hsl(215 14% 75%)" },
  ].filter(d => d.value > 0);

  // Lookup project/customer name for task detail
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Good morning! 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening with your team today.</p>
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

      {/* Quick Actions */}
      <div className="mb-7 animate-stagger-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "New Task", to: "/tasks", color: "hsl(191 91% 37%)" },
            { label: "New Project", to: "/projects", color: "hsl(142 71% 45%)" },
            { label: "Add Employee", to: "/team", color: "hsl(259 70% 60%)" },
            { label: "New Goal", to: "/goals", color: "hsl(38 92% 50%)" },
            { label: "Request Leave", to: "/leave", color: "hsl(320 70% 55%)" },
          ].map(a => (
            <Link key={a.label} to={a.to}>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ borderColor: `${a.color}30`, background: `${a.color}0d`, color: a.color }}>
                <Plus className="w-3.5 h-3.5" />
                {a.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Tasks + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-stagger-3">
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
              <div className="space-y-2">
                {recentTasks.map(task => (
                  <div key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-muted/50 cursor-pointer group"
                    onClick={() => setSelectedTask(task)}
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

        {/* Task Distribution Donut */}
        <div className="bg-card rounded-2xl border border-border/50 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-base font-semibold text-foreground mb-1">Task Status</h2>
          <p className="text-xs text-muted-foreground mb-4">{stats.total} total tasks</p>
          {stats.total > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(222 47% 12%)", border: "1px solid hsl(222 47% 20%)", borderRadius: "8px", color: "hsl(215 20% 88%)", fontSize: "12px" }} itemStyle={{ color: "hsl(215 20% 88%)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No data yet</p>
          )}

          {/* Summary stats */}
          <div className="mt-5 pt-4 border-t border-border/40 grid grid-cols-3 gap-2">
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
        </div>
      </div>

      {/* Team Progress — Full Width */}
      <div className="mt-6 animate-stagger-4">
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
              const filter = empStatusFilter[emp.id] ?? "All";
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
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: emp.progress >= 70 ? "hsl(142 71% 40%)" : emp.progress >= 40 ? "hsl(191 91% 37%)" : "hsl(38 92% 45%)" }}>
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
                  <div className="flex-1 max-h-48 overflow-y-auto space-y-1 -mx-1 px-1">
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
                            onClick={() => setSelectedTask(task)}
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-card rounded-2xl border border-border/50 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div className="flex-1 pr-3">
                <h3 className="font-semibold text-foreground text-base leading-snug">{selectedTask.name}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={selectedTask.status === "Done" ? "badge-done" : selectedTask.status === "In Progress" ? "badge-progress" : "badge-todo"}>
                    {selectedTask.status}
                  </span>
                  {selectedTask.priority && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: selectedTask.priority === "High" ? "hsl(0 84% 60% / 0.12)" : selectedTask.priority === "Medium" ? "hsl(38 92% 50% / 0.12)" : "hsl(215 14% 60% / 0.12)",
                        color: selectedTask.priority === "High" ? "hsl(0 84% 55%)" : selectedTask.priority === "Medium" ? "hsl(38 92% 45%)" : "hsl(215 14% 55%)",
                      }}>
                      {selectedTask.priority} Priority
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none flex-shrink-0 mt-0.5">
                ✕
              </button>
            </div>

            {/* Modal body */}
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
                  <div className="flex gap-4">
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
          </div>
        </div>
      )}
    </div>
  );
}
