import { useNotifications } from "@/hooks/useNotifications";
import { Bell, CheckCheck, Info, CheckCircle2, XCircle } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import { useState } from "react";

export default function Notifications() {
  const { notifications, loading, markRead, markAllRead, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;

  const iconMap = { success: CheckCircle2, error: XCircle, info: Info };
  const colorMap = {
    success: "text-green-600 bg-green-100",
    error: "text-red-500 bg-red-100",
    info: "text-blue-600 bg-blue-100",
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? <span className="text-primary font-semibold">{unreadCount} unread</span> : "All caught up!"} · {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 animate-stagger-2">
        {(["all", "unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden animate-stagger-3" style={{ boxShadow: "var(--shadow-sm)" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map(n => {
              const Icon = iconMap[n.type];
              const colors = colorMap[n.type];
              return (
                <div key={n.id} className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/30 ${!n.is_read ? "bg-primary/[0.03]" : ""}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{n.title}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)} className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors">
                      Read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
