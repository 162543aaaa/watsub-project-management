import { ClockIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { describeActivity } from "@/lib/activityDescription";

export type ActivityEntityType = "task" | "project";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  display_name?: string;
}

export default function ActivityTimeline({ entityType, entityId }: { entityType: ActivityEntityType; entityId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;

    const fetchLogs = async () => {
      setLoading(true);
      const variants = entityType === "task" ? ["task", "tasks"] : ["project", "projects"];
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .in("entity_type", variants)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(75);

      if (error) {
        console.error(error);
        if (!cancelled) setLoading(false);
        return;
      }

      const raw = (data ?? []) as AuditLog[];
      const userIds = [...new Set(raw.map((log) => log.user_id).filter(Boolean))] as string[];
      const nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
        for (const profile of profiles ?? []) nameMap[profile.user_id] = profile.display_name;
      }
      if (!cancelled) {
        setLogs(raw.map((log) => ({
          ...log,
          display_name: log.user_id ? (nameMap[log.user_id] ?? "Unknown") : "System",
        })));
        setLoading(false);
      }
    };

    void fetchLogs();
    return () => { cancelled = true; };
  }, [entityId, entityType]);

  if (loading) {
    return <div className="py-4 text-sm text-muted-foreground">Loading activity…</div>;
  }
  if (logs.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</div>;
  }

  return (
    <div className="space-y-0">
      {logs.map((log, index) => (
        <div key={log.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center self-stretch">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-info/30 bg-info/10 text-info">
              <ClockIcon className="h-3.5 w-3.5" />
            </div>
            {index < logs.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
          </div>
          <div className="min-w-0 flex-1 pb-4">
            <p className="text-sm leading-snug text-foreground">{describeActivity(log, entityType)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
