import { ClockIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from "react";
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
  display_name?: string;
}

function describe(log: AuditLog): string {
  const actor = log.display_name ?? "Someone";
  if (log.action === "created") return `${actor} created this project / สร้างโปรเจกต์`;
  if (log.action === "deleted") return `${actor} deleted this project / ลบโปรเจกต์`;
  if (log.action === "updated") {
    const keys = Object.keys(log.new_values ?? {}).filter((k) => !["id", "updated_at"].includes(k));
    return `${actor} updated ${keys.join(", ") || "this project"} / แก้ไขโปรเจกต์`;
  }
  return `${actor}: ${log.action}`;
}

export default function ProjectActivityLog({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_type", "project")
        .eq("entity_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      const raw = (data ?? []) as AuditLog[];
      const userIds = [...new Set(raw.map((l) => l.user_id).filter(Boolean))] as string[];
      const nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        for (const p of profiles ?? []) nameMap[p.user_id] = p.display_name;
      }
      setLogs(raw.map((l) => ({ ...l, display_name: l.user_id ? (nameMap[l.user_id] ?? "Unknown") : "System" })));
      setLoading(false);
    })();
  }, [projectId]);

  if (loading) return <div className="text-sm text-muted-foreground py-4">Loading…</div>;
  if (logs.length === 0) return <div className="text-sm text-muted-foreground py-4">No activity yet.</div>;

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(191 91% 37% / 0.15)", border: "1.5px solid hsl(191 91% 37% / 0.4)" }}>
            <ClockIcon className="w-3.5 h-3.5" style={{ color: "hsl(191 91% 55%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">{describe(log)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}