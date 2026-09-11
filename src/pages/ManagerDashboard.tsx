import { ArrowTopRightOnSquareIcon, ArrowTrendingUpIcon, BriefcaseIcon, ExclamationCircleIcon, UsersIcon } from "@heroicons/react/24/solid";
import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Task } from "@/hooks/useProjects";
import { calculateDeliveryHealth, calculateProjectHealth, HEALTH_LABELS, type HealthStatus } from "@/lib/projectHealth";

const CASHFLOW_URL = "https://watsub-cashflow2026.lovable.app/";

interface EnrichedTask extends Task {
  _source: "standalone" | "project" | "customer";
  _sourceName?: string;
}

function startOfDay(value: Date | string = new Date()): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function HealthPill({ status }: { status: HealthStatus }) {
  const tone = status === "complete"
    ? "border-success/20 bg-success/10 text-success"
    : status === "delayed"
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : status === "at-risk"
        ? "border-warning/30 bg-warning/15 text-foreground"
        : "border-info/20 bg-info/10 text-info";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>{HEALTH_LABELS[status]}</span>;
}

export default function ManagerDashboard() {
  const { user, isAdmin } = useAuthContext();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { customers } = useCustomers();
  const { employees } = useEmployees();

  const me = employees.find((employee) => user?.email && employee.email?.toLowerCase() === user.email.toLowerCase());
  const canSeeAll = isAdmin || (me?.role && ["manager", "admin"].includes(me.role.toLowerCase()));
  const myName = me?.name;

  const allTasks = useMemo<EnrichedTask[]>(() => {
    const standalone = tasks.map((task) => ({ ...task, _source: "standalone" as const }));
    const projectTasks = projects.flatMap((project) => project.tasks.map((task) => ({ ...task, _source: "project" as const, _sourceName: project.name })));
    const customerTasks = customers.flatMap((customer) => customer.tasks.map((task) => ({ ...task, _source: "customer" as const, _sourceName: customer.name })));
    const merged = [...standalone, ...projectTasks, ...customerTasks];
    if (canSeeAll || !myName) return merged;
    return merged.filter((task) => task.assigned_to?.includes(myName));
  }, [tasks, projects, customers, canSeeAll, myName]);

  const today = startOfDay();
  const in7 = today + 7 * 86_400_000;
  const overdue = allTasks.filter((task) => task.status !== "Done" && task.due_date && startOfDay(task.due_date) < today);
  const dueSoon = allTasks.filter((task) => task.status !== "Done" && task.due_date && startOfDay(task.due_date) >= today && startOfDay(task.due_date) <= in7);
  const done = allTasks.filter((task) => task.status === "Done").length;
  const completionRate = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;

  const projectHealth = useMemo(
    () => projects.map((project) => ({ project, health: calculateProjectHealth(project) })),
    [projects],
  );
  const projectHealthCounts = useMemo(() => ({
    onTrack: projectHealth.filter(({ health }) => health.status === "on-track").length,
    atRisk: projectHealth.filter(({ health }) => health.status === "at-risk").length,
    delayed: projectHealth.filter(({ health }) => health.status === "delayed").length,
    complete: projectHealth.filter(({ health }) => health.status === "complete").length,
  }), [projectHealth]);

  const clientHealth = useMemo(() => customers.map((customer) => ({
    customer,
    health: calculateDeliveryHealth(customer.tasks, customer.deadline),
  })), [customers]);

  const workload = useMemo(() => {
    const map = new Map<string, { active: number; overdue: number; done: number }>();
    for (const employee of employees) map.set(employee.name, { active: 0, overdue: 0, done: 0 });
    for (const task of allTasks) {
      for (const name of task.assigned_to ?? []) {
        const current = map.get(name) ?? { active: 0, overdue: 0, done: 0 };
        if (task.status === "Done") current.done += 1;
        else {
          current.active += 1;
          if (task.due_date && startOfDay(task.due_date) < today) current.overdue += 1;
        }
        map.set(name, current);
      }
    }
    return [...map.entries()]
      .map(([name, item]) => ({ ...item, name, total: item.active + item.done, rate: item.active + item.done ? Math.round((item.done / (item.active + item.done)) * 100) : 0 }))
      .sort((a, b) => b.active - a.active);
  }, [employees, allTasks, today]);

  return (
    <div className="space-y-6 p-4 sm:p-6 page-enter">
      <section className="ops-dashboard-hero">
        <div>
          <p className="ops-kicker">Executive workspace</p>
          <h1 className="ops-display">STUDIO OVERVIEW</h1>
          <p className="mt-2 text-sm text-muted-foreground">WatSUB creative operations at a glance.</p>
        </div>
        <a href={CASHFLOW_URL} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
          Open Cashflow <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </a>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={BriefcaseIcon} label="Active projects" value={projects.length} tone="info" />
        <KpiCard icon={UsersIcon} label="Active clients" value={customers.length} tone="accent" />
        <KpiCard icon={ExclamationCircleIcon} label="Overdue tasks" value={overdue.length} tone={overdue.length ? "danger" : "success"} />
        <KpiCard icon={ArrowTrendingUpIcon} label="Completion rate" value={`${completionRate}%`} tone="success" />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Project Health</h2>
            <p className="text-xs text-muted-foreground">Calculated from deadline, overdue work and completion.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-info/10 px-2 py-1 text-info">On Track {projectHealthCounts.onTrack}</span>
            <span className="rounded-full bg-warning/15 px-2 py-1 text-foreground">At Risk {projectHealthCounts.atRisk}</span>
            <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">Delayed {projectHealthCounts.delayed}</span>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          {projectHealth.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No active projects.</p>
          ) : (
            <div className="divide-y divide-border/40">
              {projectHealth
                .sort((a, b) => ({ delayed: 0, "at-risk": 1, "on-track": 2, complete: 3 }[a.health.status] - { delayed: 0, "at-risk": 1, "on-track": 2, complete: 3 }[b.health.status]))
                .map(({ project, health }) => (
                  <div key={project.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{project.name}</p>
                        <HealthPill status={health.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{health.reasons[0]}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{health.completion}% complete</span>
                    <span className="text-xs font-medium">{project.deadline || "No deadline"}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {canSeeAll && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Team Load</h2>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr><th className="p-3 text-left">Name</th><th className="p-3 text-right">Active</th><th className="p-3 text-right">Overdue</th><th className="p-3 text-right">Done</th><th className="p-3 text-right">Completion</th></tr>
              </thead>
              <tbody>
                {workload.map((item) => (
                  <tr key={item.name} className="border-t border-border/40">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-right">{item.active}</td>
                    <td className={`p-3 text-right ${item.overdue ? "text-destructive" : ""}`}>{item.overdue}</td>
                    <td className="p-3 text-right">{item.done}</td>
                    <td className="p-3 text-right">{item.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TaskListCard title="Overdue tasks" tasks={overdue.slice(0, 12)} />
        <TaskListCard title="Due in next 7 days" tasks={dueSoon.slice(0, 12)} />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold">Client Status</h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          {clientHealth.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No active clients.</p>
          ) : (
            <div className="divide-y divide-border/40">
              {clientHealth.map(({ customer, health }) => (
                <div key={customer.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{customer.name}</p>
                      <HealthPill status={health.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{health.reasons[0]}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{health.completion}% complete</span>
                  <span className="text-xs font-medium">{customer.deadline || "No deadline"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="ops-kicker">Finance snapshot</p>
            <h2 className="mt-1 text-lg font-semibold">Revenue & Budget</h2>
            <p className="mt-1 text-sm text-muted-foreground">Financial totals remain in WATSUB Cashflow until a verified data adapter is connected.</p>
          </div>
          <a href={CASHFLOW_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            Open finance system <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string | number; tone: "info" | "accent" | "danger" | "success" }) {
  const toneClass = {
    info: "bg-info/10 text-info",
    accent: "bg-secondary text-secondary-foreground",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  }[tone];
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className={`mb-4 flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function TaskListCard({ title, tasks }: { title: string; tasks: EnrichedTask[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <h3 className="border-b border-border/60 p-3 text-sm font-semibold">{title}</h3>
      {tasks.length === 0 ? (
        <p className="p-4 text-center text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {tasks.map((task) => (
            <li key={`${task._source}-${task.id}`} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{task.name}</p>
                <p className="truncate text-xs text-muted-foreground">{task._sourceName ?? "Standalone"} · {(task.assigned_to ?? []).join(", ") || "Unassigned"}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{task.due_date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
