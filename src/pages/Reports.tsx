import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, CheckCircle2, AlertCircle, FolderOpen, Clock, Trophy, TrendingUp } from "lucide-react";

type Task = { id: string; name: string; status: string; priority: string; due_date?: string | null; assigned_to: string[]; task_type: string; project_id?: string | null; customer_id?: string | null };
type Employee = { id: string; name: string };
type LeaveRequest = { id: string; status: string };

const YEARS = [2025, 2026, 2027];
const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const today = new Date();

const gradients = ["from-cyan-400 to-teal-500", "from-violet-400 to-purple-500", "from-rose-400 to-pink-500", "from-amber-400 to-orange-500", "from-blue-400 to-indigo-500"];

export default function Reports() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(2026);
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");

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

  // We don't have a year column on tasks directly, so we filter by due_date year
  // For tasks linked to project/customer we rely on due_date
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.due_date) return filterMonth === "all"; // if no due_date, include in "all months"
      const d = new Date(t.due_date);
      const yearMatch = d.getFullYear() === filterYear;
      const monthMatch = filterMonth === "all" || (d.getMonth() + 1) === filterMonth;
      return yearMatch && monthMatch;
    });
  }, [tasks, filterYear, filterMonth]);

  const allTasks = filteredTasks;

  const stats = [
    { label: "Total Tasks", value: allTasks.length, icon: BarChart3, color: "bg-gradient-primary" },
    { label: "Completed", value: allTasks.filter(t => t.status === "Done").length, icon: CheckCircle2, color: "bg-gradient-success" },
    { label: "Overdue", value: allTasks.filter(t => t.status !== "Done" && t.due_date && new Date(t.due_date) < today).length, icon: AlertCircle, color: "bg-gradient-danger" },
    { label: "Active Projects", value: projectCount, icon: FolderOpen, color: "bg-gradient-warning" },
    { label: "Total Employees", value: employees.length, icon: Users, color: "bg-gradient-primary" },
    { label: "Pending Leave", value: leaveRequests.filter(l => l.status === "Pending").length, icon: Clock, color: "bg-gradient-warning" },
  ];

  const topPerformers = useMemo(() => employees.map(emp => {
    const myTasks = allTasks.filter(t => t.assigned_to.includes(emp.name));
    const done = myTasks.filter(t => t.status === "Done").length;
    return { ...emp, total: myTasks.length, done, pct: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 };
  }).sort((a, b) => b.pct - a.pct), [employees, allTasks]);

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

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-6 page-enter">
      <div className="mb-6 animate-stagger-1">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Team & project analytics overview</p>
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
        {/* Top Performers */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 animate-stagger-4" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-foreground">Top Performers</h2>
          </div>
          {topPerformers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data for this period</p>
          ) : (
            <div className="space-y-4">
              {topPerformers.slice(0, 5).map((emp, i) => (
                <div key={emp.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white text-xs font-bold`}>
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.done}/{emp.total} tasks</div>
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
