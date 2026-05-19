import { ArrowTrendingUpIcon, ClockIcon, ExclamationCircleIcon, UsersIcon } from '@heroicons/react/24/solid';
import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Task } from "@/hooks/useProjects";
interface EnrichedTask extends Task {
  _source: "standalone" | "project" | "customer";
  _sourceName?: string;
}

function startOfDay(d = new Date()): number {
  const c = new Date(d); c.setHours(0,0,0,0); return c.getTime();
}

export default function ManagerDashboard() {
  const { user, isAdmin } = useAuthContext();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { customers } = useCustomers();
  const { employees } = useEmployees();

  const me = employees.find((e) => user?.email && e.email?.toLowerCase() === user.email.toLowerCase());
  const canSeeAll = isAdmin || (me?.role && ["manager", "admin"].includes(me.role.toLowerCase()));
  const myName = me?.name;

  const allTasks = useMemo<EnrichedTask[]>(() => {
    const s: EnrichedTask[] = tasks.map((t) => ({ ...t, _source: "standalone" }));
    const p: EnrichedTask[] = projects.flatMap((pr) => pr.tasks.map((t) => ({ ...t, _source: "project", _sourceName: pr.name })));
    const c: EnrichedTask[] = customers.flatMap((cu) => cu.tasks.map((t) => ({ ...t, _source: "customer", _sourceName: cu.name })));
    const merged = [...s, ...p, ...c];
    if (canSeeAll || !myName) return merged;
    return merged.filter((t) => t.assigned_to?.includes(myName));
  }, [tasks, projects, customers, canSeeAll, myName]);

  const today = startOfDay();
  const in7 = today + 7 * 86400_000;

  const overdue = allTasks.filter((t) => t.status !== "Done" && t.due_date && startOfDay(new Date(t.due_date)) < today);
  const dueSoon = allTasks.filter((t) => t.status !== "Done" && t.due_date && startOfDay(new Date(t.due_date)) >= today && startOfDay(new Date(t.due_date)) <= in7);
  const atRisk = allTasks.filter((t) => t.status === "To Do" && t.due_date && startOfDay(new Date(t.due_date)) <= today + 2 * 86400_000);

  // Workload per employee
  const workload = useMemo(() => {
    const map = new Map<string, { active: number; overdue: number; done: number }>();
    for (const e of employees) map.set(e.name, { active: 0, overdue: 0, done: 0 });
    for (const t of allTasks) {
      for (const name of t.assigned_to ?? []) {
        const w = map.get(name) ?? { active: 0, overdue: 0, done: 0 };
        if (t.status === "Done") w.done++;
        else {
          w.active++;
          if (t.due_date && startOfDay(new Date(t.due_date)) < today) w.overdue++;
        }
        map.set(name, w);
      }
    }
    return [...map.entries()]
      .map(([name, w]) => ({ name, ...w, total: w.active + w.done, rate: w.active + w.done ? Math.round((w.done / (w.active + w.done)) * 100) : 0 }))
      .sort((a, b) => b.active - a.active);
  }, [employees, allTasks, today]);

  const overloaded = workload.filter((w) => w.active >= 5).slice(0, 5);

  const projectProgress = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "Done").length;
    return { id: p.id, name: p.name, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }).filter((p) => p.total > 0 && p.pct >= 80).sort((a, b) => b.pct - a.pct);

  return (
    <div className="p-6 page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {canSeeAll ? "Team-wide overview" : "Your personal summary"}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={ExclamationCircleIcon} label="Overdue" value={overdue.length} color="hsl(0 84% 55%)" />
        <KpiCard icon={ClockIcon} label="Due in 7 days" value={dueSoon.length} color="hsl(35 90% 50%)" />
        <KpiCard icon={ArrowTrendingUpIcon} label="At risk" value={atRisk.length} color="hsl(280 70% 55%)" />
        <KpiCard icon={UsersIcon} label={canSeeAll ? "Overloaded (5+)" : "Active tasks"} value={canSeeAll ? overloaded.length : allTasks.filter(t => t.status !== "Done").length} color="hsl(191 91% 45%)" />
      </div>

      {/* Workload table */}
      {canSeeAll && (
        <section>
          <h2 className="text-base font-semibold mb-3">Workload by employee</h2>
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-right p-3">Active</th>
                  <th className="text-right p-3">Overdue</th>
                  <th className="text-right p-3">Done</th>
                  <th className="text-right p-3">Completion %</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((w) => (
                  <tr key={w.name} className="border-t border-border/40">
                    <td className="p-3">{w.name}</td>
                    <td className="p-3 text-right">{w.active}</td>
                    <td className="p-3 text-right" style={{ color: w.overdue > 0 ? "hsl(0 84% 55%)" : undefined }}>{w.overdue}</td>
                    <td className="p-3 text-right">{w.done}</td>
                    <td className="p-3 text-right">{w.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Overdue + due soon tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskListCard title="Overdue tasks" tasks={overdue.slice(0, 15)} />
        <TaskListCard title="Due in next 7 days" tasks={dueSoon.slice(0, 15)} />
      </div>

      {/* Projects close to completion */}
      {projectProgress.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Projects ≥80% complete</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projectProgress.map((p) => (
              <div key={p.id} className="bg-card border border-border/60 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.done}/{p.total} tasks done</p>
                </div>
                <span className="text-sm font-bold text-primary">{p.pct}%</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function TaskListCard({ title, tasks }: { title: string; tasks: EnrichedTask[] }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <h3 className="text-sm font-semibold p-3 border-b border-border/60">{title}</h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4 text-center">Nothing here. </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {tasks.map((t) => (
            <li key={`${t._source}-${t.id}`} className="p-3 text-sm flex justify-between items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t._sourceName ?? "Standalone"} · {(t.assigned_to ?? []).join(", ") || "Unassigned"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t.due_date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}