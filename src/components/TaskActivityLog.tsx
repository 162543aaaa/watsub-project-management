import { ArrowRightIcon, ClockIcon } from '@heroicons/react/24/solid';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  // joined from profiles
  display_name?: string;
}

interface TaskActivityLogProps {
  taskId: string;
}

function parseAction(log: AuditLog): string {
  const actor = log.display_name ?? "Someone";

  if (log.action === "created") {
    return `${actor} created this task`;
  }

  if (log.action === "deleted") {
    return `${actor} deleted this task`;
  }

  // status_changed:To Do→In Progress
  if (log.action.startsWith("status_changed:")) {
    const transition = log.action.replace("status_changed:", "");
    const [from, to] = transition.split("→");
    return `${actor} changed status from "${from}" to "${to}"`;
  }

  if (log.action === "updated") {
    const changes = log.new_values ?? {};
    const keys = Object.keys(changes).filter(k => !["id", "created_at", "sort_order"].includes(k));
    if (keys.length === 0) return `${actor} updated this task`;
    if (keys.length === 1) {
      const key = keys[0];
      const oldVal = log.old_values?.[key];
      const newVal = changes[key];
      const label = fieldLabel(key);
      if (oldVal !== undefined && oldVal !== null && oldVal !== "") {
        return `${actor} changed ${label} from "${oldVal}" to "${newVal}"`;
      }
      return `${actor} set ${label} to "${newVal}"`;
    }
    return `${actor} updated ${keys.map(fieldLabel).join(", ")}`;
  }

  return `${actor} performed "${log.action}"`;
}

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    name: "name",
    status: "status",
    priority: "priority",
    due_date: "due date",
    start_date: "start date",
    assigned_to: "assignees",
    comments: "note",
    link: "link",
    category: "category",
  };
  return map[key] ?? key;
}

export default function TaskActivityLog({ taskId }: TaskActivityLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;

    const fetchLogs = async () => {
      setLoading(true);
      // Fetch audit logs for this task, then join display names from profiles
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_type", "task")
        .eq("entity_id", taskId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) { console.error(error); setLoading(false); return; }

      const rawLogs = (data ?? []) as AuditLog[];

      // Batch-fetch display names for all unique user_ids
      const userIds = [...new Set(rawLogs.map(l => l.user_id).filter(Boolean))] as string[];
      const nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        for (const p of profiles ?? []) {
          nameMap[p.user_id] = p.display_name;
        }
      }

      setLogs(rawLogs.map(l => ({
        ...l,
        display_name: l.user_id ? (nameMap[l.user_id] ?? "Unknown") : "System",
      })));
      setLoading(false);
    };

    fetchLogs();
  }, [taskId]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log, idx) => (
        <div key={log.id} className="flex gap-3 items-start group">
          {/* Timeline line + dot */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(191 91% 37% / 0.15)", border: "1.5px solid hsl(191 91% 37% / 0.4)" }}
            >
              <ClockIcon className="w-3.5 h-3.5" style={{ color: "hsl(191 91% 55%)" }} />
            </div>
            {idx < logs.length - 1 && (
              <div className="w-px flex-1 my-1 min-h-[16px]" style={{ background: "hsl(222 47% 20%)" }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4 min-w-0">
            <p className="text-sm text-foreground leading-snug">
              {parseAction(log)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
