import { useState } from "react";
import { Plus, TrendingUp, CheckCircle2, AlertCircle, Users, ArrowRight, Clock } from "lucide-react";
import { projects, customers, standaloneTasksList, employees, leaveRequests, notifications } from "@/data/mockData";
import { Link } from "react-router-dom";

const allProjectTasks = projects.flatMap(p => p.tasks);
const allCustomerTasks = customers.flatMap(c => c.tasks);
const allTasks = [...allProjectTasks, ...allCustomerTasks, ...standaloneTasksList];
const today = new Date("2026-02-20");

function getEmployeeStats() {
  return employees.map(emp => {
    const myTasks = allTasks.filter(t => t.assignedTo.includes(emp.name));
    const done = myTasks.filter(t => t.status === "Done").length;
    return { ...emp, total: myTasks.length, done, progress: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 };
  });
}

const completedTasks = allTasks.filter(t => t.status === "Done").length;
const activeTasks = allTasks.filter(t => t.status === "In Progress").length;
const overdueTasks = allTasks.filter(t => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < today).length;
const completionRate = allTasks.length ? Math.round((completedTasks / allTasks.length) * 100) : 0;

const statCards = [
  { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, gradient: "bg-gradient-primary", shadow: "shadow-primary", iconBg: "hsl(191 91% 30% / 0.3)" },
  { label: "Active Tasks", value: activeTasks, icon: Clock, gradient: "bg-gradient-success", shadow: "", iconBg: "hsl(142 71% 35% / 0.3)" },
  { label: "Overdue Tasks", value: overdueTasks, icon: AlertCircle, gradient: "bg-gradient-danger", shadow: "", iconBg: "hsl(0 84% 50% / 0.3)" },
  { label: "Team Size", value: employees.length, icon: Users, gradient: "bg-gradient-warning", shadow: "", iconBg: "hsl(38 92% 40% / 0.3)" },
];

const recentTasks = [...allTasks]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5);

export default function Dashboard() {
  const empStats = getEmployeeStats();
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning! 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening with your team today.</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Link to="/notifications" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border"
              style={{ borderColor: "hsl(0 84% 60% / 0.3)", background: "hsl(0 84% 60% / 0.06)", color: "hsl(0 84% 55%)" }}>
              <AlertCircle className="w-4 h-4" />
              {unread} unread
            </Link>
          )}
          <Link to="/tasks">
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={card.label} className={`stat-card animate-stagger-${i + 1}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.gradient}`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">2026</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{card.value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 animate-stagger-2">
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "New Task", to: "/tasks", color: "hsl(191 91% 37%)" },
            { label: "New Project", to: "/projects", color: "hsl(142 71% 45%)" },
            { label: "Add Employee", to: "/team", color: "hsl(259 70% 60%)" },
            { label: "New Goal", to: "/goals", color: "hsl(38 92% 50%)" },
            { label: "Request Leave", to: "/leave", color: "hsl(320 70% 55%)" },
          ].map(a => (
            <Link key={a.label} to={a.to}>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 hover:scale-105 hover:shadow-md"
                style={{ borderColor: `${a.color}30`, background: `${a.color}10`, color: a.color }}>
                <Plus className="w-3.5 h-3.5" />
                {a.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 animate-stagger-3">
          <div className="bg-card rounded-2xl border border-border/50 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Recent Tasks</h2>
              <Link to="/tasks" className="flex items-center gap-1 text-xs font-medium text-primary hover:gap-2 transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-150 hover:bg-muted/50">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{task.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {task.assignedTo.slice(0, 2).join(", ")}{task.assignedTo.length > 2 ? ` +${task.assignedTo.length - 2}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
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
          </div>
        </div>

        {/* Team Progress */}
        <div className="animate-stagger-4">
          <div className="bg-card rounded-2xl border border-border/50 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-base font-semibold text-foreground mb-4">Team Progress</h2>
            <div className="space-y-4">
              {empStats.map((emp) => (
                <div key={emp.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${["from-cyan-400 to-teal-500", "from-violet-400 to-purple-500", "from-rose-400 to-pink-500"][employees.findIndex(e => e.id === emp.id) % 3]} flex items-center justify-center text-white text-xs font-bold avatar-hover flex-shrink-0`}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.done}/{emp.total} tasks</div>
                    </div>
                    <span className="text-sm font-bold text-primary">{emp.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${emp.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Projects summary */}
            <div className="mt-5 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Projects</span>
                <span className="font-semibold text-foreground">{projects.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="text-muted-foreground">Total Customers</span>
                <span className="font-semibold text-foreground">{customers.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="text-muted-foreground">Pending Leave</span>
                <span className="font-semibold text-foreground">{leaveRequests.filter(l => l.status === "Pending").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
