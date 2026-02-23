import { useMemo } from "react";
import { Plus, TrendingUp, CheckCircle2, AlertCircle, Users, ArrowRight, Clock, TrendingDown, Minus, Video, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useNotifications } from "@/hooks/useNotifications";
import { useMeetings } from "@/hooks/useMeetings";
import { useOnsiteWork } from "@/hooks/useOnsiteWork";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import EmployeeAvatar from "@/components/EmployeeAvatar";

const today = new Date();

const avatarGradients = [
  "from-cyan-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
];

// Define StatCard BEFORE Dashboard so no ref warning
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
      const progress = myTasks.length ? Math.round((done / myTasks.length) * 100) : 0;
      return { ...emp, total: myTasks.length, done, progress };
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
        <StatCard
          label="Completion Rate"
          value={`${stats.rate}%`}
          sub={`${stats.completed}/${stats.total} tasks`}
          icon={TrendingUp}
          gradient="bg-gradient-primary"
          trend={stats.rate >= 50 ? "up" : "down"}
        />
        <StatCard
          label="Active Tasks"
          value={stats.inProgress}
          sub="In Progress"
          icon={Clock}
          gradient="bg-gradient-success"
          trend="neutral"
        />
        <StatCard
          label="Overdue Tasks"
          value={stats.overdue}
          sub="Past due date"
          icon={AlertCircle}
          gradient="bg-gradient-danger"
          trend={stats.overdue > 0 ? "down" : "up"}
          trendLabel={stats.overdue > 0 ? "Needs attention" : "All on track"}
        />
        <StatCard
          label="Team Size"
          value={employees.length}
          sub={`${projects.length} active projects`}
          icon={Users}
          gradient="bg-gradient-warning"
          trend="neutral"
        />
        <StatCard
          label="Meetings"
          value={meetings.length + allTasks.filter(t => t.category === "meeting").length}
          sub="การประชุมทั้งหมด"
          icon={Video}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          trend="neutral"
        />
        <StatCard
          label="On-site Work"
          value={onsiteWork.length + allTasks.filter(t => t.category === "onsite").length}
          sub="งานออกกองทั้งหมด"
          icon={MapPin}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          trend="neutral"
        />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 animate-stagger-3">
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
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-muted/50 group">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{task.name}</div>
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
                      <span className={
                        task.status === "Done" ? "badge-done" :
                        task.status === "In Progress" ? "badge-progress" : "badge-todo"
                      }>{task.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5 animate-stagger-4">
          {/* Task Distribution Donut */}
          <div className="bg-card rounded-2xl border border-border/50 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-base font-semibold text-foreground mb-1">Task Status</h2>
            <p className="text-xs text-muted-foreground mb-4">{stats.total} total tasks</p>
            {stats.total > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={28} outerRadius={48}
                        paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(222 47% 12%)", border: "1px solid hsl(222 47% 20%)", borderRadius: "8px", color: "hsl(215 20% 88%)", fontSize: "12px" }}
                        itemStyle={{ color: "hsl(215 20% 88%)" }}
                      />
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
          </div>

          {/* Team Progress */}
          <div className="bg-card rounded-2xl border border-border/50 p-5 flex-1" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Team Progress</h2>
              <Link to="/team" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {employeeStats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No team data</p>
            ) : (
              <div className="space-y-3.5">
                {employeeStats.slice(0, 4).map((emp, idx) => (
                  <div key={emp.id}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <EmployeeAvatar name={emp.name} avatar={emp.avatar} size="sm" index={idx} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{emp.name}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.done}/{emp.total} tasks</div>
                      </div>
                      <span className="text-xs font-bold" style={{ color: emp.progress >= 70 ? "hsl(142 71% 40%)" : emp.progress >= 40 ? "hsl(191 91% 37%)" : "hsl(38 92% 45%)" }}>
                        {emp.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${emp.progress}%`,
                          background: emp.progress >= 70 ? "hsl(142 71% 45%)" : emp.progress >= 40 ? "hsl(191 91% 37%)" : "hsl(38 92% 50%)"
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
