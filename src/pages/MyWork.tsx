import { useMyWork } from "@/hooks/useMyWork";
import { Link } from "react-router-dom";
import { AlertCircle, Clock, CalendarDays, Loader2, CheckCircle2, AlertTriangle, ListTodo } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import type { MyWorkTask } from "@/hooks/useMyWork";

const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  overdue:           { label: "Overdue / เลยกำหนด",          icon: AlertCircle,    color: "hsl(0 84% 55%)" },
  today:             { label: "Due Today / ครบกำหนดวันนี้",   icon: CalendarDays,   color: "hsl(35 90% 50%)" },
  dueSoon:           { label: "Due Soon (7 days)",            icon: Clock,          color: "hsl(191 91% 45%)" },
  inProgress:        { label: "In Progress",                  icon: Loader2,        color: "hsl(220 70% 55%)" },
  waitingEvidence:   { label: "Waiting for Evidence / Link",  icon: AlertTriangle,  color: "hsl(280 70% 55%)" },
  recentlyCompleted: { label: "Recently Completed",           icon: CheckCircle2,   color: "hsl(142 71% 45%)" },
};

function sourceLink(t: MyWorkTask): string {
  if (t._source === "project") return "/projects";
  if (t._source === "customer") return "/customers";
  return "/tasks";
}

function TaskRow({ t }: { t: MyWorkTask }) {
  return (
    <Link
      to={sourceLink(t)}
      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{t.name}</span>
          <span className={t.priority === "High" ? "badge-high" : t.priority === "Medium" ? "badge-medium" : "badge-low"}>
            {t.priority}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
          <span className="capitalize">{t._source}</span>
          {t._sourceName && <span>· {t._sourceName}</span>}
          {t.due_date && <span>· due {t.due_date}</span>}
          <span>· {t.status}</span>
        </div>
      </div>
    </Link>
  );
}

export default function MyWork() {
  const { employee, myName, sections, loading, totalAssigned } = useMyWork();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!myName) {
    return (
      <div className="p-6 page-enter">
        <h1 className="text-2xl font-bold mb-2">My Work</h1>
        <div className="bg-card border border-border/60 rounded-2xl p-8 text-center">
          <ListTodo className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            Your account email is not linked to an employee record. Ask an admin to add you to the team list.
          </p>
        </div>
      </div>
    );
  }

  const orderedKeys: (keyof typeof sections)[] = ["overdue", "today", "dueSoon", "waitingEvidence", "inProgress", "recentlyCompleted"];

  return (
    <div className="p-6 page-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Work</h1>
        <p className="text-sm text-muted-foreground">
          {employee?.name} · {totalAssigned} task{totalAssigned === 1 ? "" : "s"} assigned to you
        </p>
      </div>

      <div className="space-y-6">
        {orderedKeys.map((key) => {
          const list = sections[key];
          if (list.length === 0) return null;
          const meta = SECTION_META[key];
          const Icon = meta.icon;
          return (
            <section key={key}>
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: meta.color }}>
                <Icon className="w-4 h-4" />
                {meta.label}
                <span className="text-xs text-muted-foreground font-normal">({list.length})</span>
              </h2>
              <div className="space-y-1.5">
                {list.map((t) => <TaskRow key={`${t._source}-${t.id}`} t={t} />)}
              </div>
            </section>
          );
        })}
        {orderedKeys.every((k) => sections[k].length === 0) && (
          <div className="bg-card border border-border/60 rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-3" />
            <p className="text-sm">All clear! No active tasks right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}