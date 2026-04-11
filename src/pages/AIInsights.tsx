import { useState, useCallback } from "react";
import {
  Brain,
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useTeamContext } from "@/hooks/useTeamContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { AIRecommendation, TeamContext } from "@/types/ai";

const GEMINI_SYSTEM_PROMPT = `You are an expert Scrum Master and Project Manager. Analyze the provided team workload and task deadlines. Your rules: No employee should have more than 5 'In Progress' tasks. Identify bottleneck risks. Suggest task reassignments to balance the workload. Return ONLY a JSON array of recommendations matching the AIRecommendation interface.

Each recommendation must be a JSON object with these exact fields:
{
  "id": "unique-string",
  "type": "risk_alert" | "reassign_task" | "timeline_adjustment",
  "description": "Short, human-readable summary of the recommendation",
  "reasoning": "Detailed explanation of why this recommendation is made",
  "suggested_action": {
    "taskId": "uuid of the task to act on (optional)",
    "newAssigneeId": "uuid of the employee to reassign to (optional)",
    "newDeadline": "YYYY-MM-DD (optional)",
    "affectedEmployeeId": "uuid of the overloaded employee (optional)"
  },
  "status": "pending"
}`;

// ─── helpers ────────────────────────────────────────────────────────────────

function typeIcon(type: AIRecommendation["type"]) {
  if (type === "risk_alert") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (type === "reassign_task") return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
  return <CalendarClock className="w-4 h-4 text-purple-500" />;
}

function typeBadge(type: AIRecommendation["type"]) {
  const map = {
    risk_alert: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    reassign_task: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    timeline_adjustment: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  const label = { risk_alert: "Risk Alert", reassign_task: "Reassign Task", timeline_adjustment: "Timeline Adjustment" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[type]}`}>
      {label[type]}
    </span>
  );
}

// ─── Team Health Summary ─────────────────────────────────────────────────────

function TeamHealthPanel({ ctx }: { ctx: TeamContext }) {
  const { summary, totalEmployees, overdueTasks, urgentTasks } = ctx;
  const overloaded = summary.overloadedEmployees.length;
  const healthScore = Math.max(
    0,
    100 - summary.overdueCount * 10 - overloaded * 20 - summary.urgentCount * 5,
  );

  const stats = [
    {
      label: "Overdue Tasks",
      value: summary.overdueCount,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: summary.overdueCount > 0 ? "text-red-500" : "text-emerald-500",
      bg: summary.overdueCount > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Due in 3 Days",
      value: summary.urgentCount,
      icon: <Clock className="w-4 h-4" />,
      color: summary.urgentCount > 0 ? "text-amber-500" : "text-emerald-500",
      bg: summary.urgentCount > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Overloaded Employees",
      value: overloaded,
      icon: <Users className="w-4 h-4" />,
      color: overloaded > 0 ? "text-red-500" : "text-emerald-500",
      bg: overloaded > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Unassigned Tasks",
      value: summary.unassignedTaskCount,
      icon: <Zap className="w-4 h-4" />,
      color: summary.unassignedTaskCount > 0 ? "text-amber-500" : "text-emerald-500",
      bg: summary.unassignedTaskCount > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6 animate-stagger-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold">Team Health Overview</h2>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${healthScore >= 80 ? "text-emerald-500" : healthScore >= 50 ? "text-amber-500" : "text-red-500"}`}>
            {healthScore}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{totalEmployees} team members</div>
        </div>
      </div>

      <Progress value={healthScore} className="h-2 mb-4" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl p-3 flex items-center gap-2.5 ${s.bg}`}>
            <div className={s.color}>{s.icon}</div>
            <div>
              <div className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {summary.overloadedEmployees.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300">
          <strong>Overloaded:</strong>{" "}
          {summary.overloadedEmployees.join(", ")} — each has more than 5 In Progress tasks.
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Most overdue:</p>
          <div className="flex flex-wrap gap-1.5">
            {overdueTasks.slice(0, 4).map((t) => (
              <span
                key={t.id}
                className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium"
              >
                {t.name} ({t.daysOverdue}d ago)
              </span>
            ))}
            {overdueTasks.length > 4 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{overdueTasks.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {urgentTasks.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Due soon:</p>
          <div className="flex flex-wrap gap-1.5">
            {urgentTasks.slice(0, 4).map((t) => (
              <span
                key={t.id}
                className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium"
              >
                {t.name} (in {t.daysUntilDue}d)
              </span>
            ))}
            {urgentTasks.length > 4 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{urgentTasks.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────────

interface RecCardProps {
  rec: AIRecommendation;
  onApprove: (rec: AIRecommendation) => Promise<void>;
  onReject: (id: string) => void;
  approving: boolean;
}

function RecCard({ rec, onApprove, onReject, approving }: RecCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const isDone = rec.status !== "pending";

  return (
    <div
      className={`bg-card rounded-2xl border border-border/60 overflow-hidden transition-opacity ${isDone ? "opacity-60" : ""}`}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="mt-0.5 flex-shrink-0">{typeIcon(rec.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {typeBadge(rec.type)}
              {rec.status === "approved" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Approved
                </span>
              )}
              {rec.status === "rejected" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Rejected
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{rec.description}</p>
          </div>
        </div>

        {/* Reasoning toggle */}
        <button
          onClick={() => setShowReasoning((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          {showReasoning ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {showReasoning ? "Hide" : "Show"} reasoning
        </button>

        {showReasoning && (
          <div className="mb-3 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground leading-relaxed">
            {rec.reasoning}
          </div>
        )}

        {/* Action buttons */}
        {rec.status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(rec)}
              disabled={approving}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {approving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Approve
            </button>
            <button
              onClick={() => onReject(rec.id)}
              disabled={approving}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}

        {rec.status === "approved" && rec.type === "reassign_task" && rec.suggested_action.taskId && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Task reassignment applied to the database.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIInsights() {
  const { data: teamContext, isLoading: ctxLoading, refetch: refetchCtx } = useTeamContext();

  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  // ── Call Gemini REST API directly from the browser ────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!teamContext) return;
    setAnalyzing(true);
    setAnalyzed(false);
    
    try {
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
      if (!geminiKey) {
        throw new Error(
          "VITE_GEMINI_API_KEY is not set. Add it in Lovable → Project Settings → Environment Variables."
        );
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: JSON.stringify(teamContext, null, 2) }] }],
            generationConfig: { response_mime_type: "application/json" },
          }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errBody}`);
      }
      const json = await res.json();
      const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const parsed = JSON.parse(text);
      const recs: AIRecommendation[] = Array.isArray(parsed) ? parsed : (parsed.recommendations ?? []);
      setRecommendations(recs);
      setAnalyzed(true);
      toast({ title: `AI analysis complete — ${recs.length} recommendation(s) generated.` });
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  }, [teamContext]);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = useCallback(async (rec: AIRecommendation) => {
    setApprovingId(rec.id);

    try {
      if (rec.type === "reassign_task" && rec.suggested_action.taskId && rec.suggested_action.newAssigneeId) {
        // Optimistic update first
        setRecommendations((prev) =>
          prev.map((r) => (r.id === rec.id ? { ...r, status: "approved" } : r)),
        );

        // Fetch current task to get the full assigned_to array
        const { data: task, error: fetchErr } = await supabase
          .from("tasks")
          .select("assigned_to")
          .eq("id", rec.suggested_action.taskId)
          .single();

        if (fetchErr) throw fetchErr;

        // Replace the overloaded assignee if found; otherwise just set to new assignee
        const current: string[] = Array.isArray(task?.assigned_to) ? task.assigned_to : [];
        const affectedId = rec.suggested_action.affectedEmployeeId;
        let updated: string[];
        if (affectedId && current.includes(affectedId)) {
          updated = current.map((id) =>
            id === affectedId ? rec.suggested_action.newAssigneeId! : id,
          );
        } else {
          updated = [...current, rec.suggested_action.newAssigneeId!];
        }

        const { error: updateErr } = await supabase
          .from("tasks")
          .update({ assigned_to: updated })
          .eq("id", rec.suggested_action.taskId);

        if (updateErr) throw updateErr;

        toast({ title: "Task reassigned successfully!" });
      } else {
        // For non-reassign types: just mark approved (acknowledge)
        setRecommendations((prev) =>
          prev.map((r) => (r.id === rec.id ? { ...r, status: "approved" } : r)),
        );
        toast({ title: "Recommendation acknowledged." });
      }
    } catch (e) {
      // Rollback optimistic update
      setRecommendations((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: "pending" } : r)),
      );
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  }, []);

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = useCallback((id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
    );
    toast({ title: "Recommendation dismissed." });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (ctxLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Gathering team context…</p>
        </div>
      </div>
    );
  }

  const pending = recommendations.filter((r) => r.status === "pending");
  const done = recommendations.filter((r) => r.status !== "pending");

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Human-in-the-Loop AI Project Manager
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetchCtx(); setAnalyzed(false); setRecommendations([]); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
            title="Refresh team data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
          <button
            onClick={runAnalysis}
            disabled={analyzing || !teamContext}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {analyzing ? "Analyzing…" : "Run AI Analysis"}
          </button>
        </div>
      </div>

      {/* Team Health Panel */}
      {teamContext && <TeamHealthPanel ctx={teamContext} />}

      {/* Pre-analysis prompt */}
      {!analyzed && !analyzing && (
        <div className="text-center py-16 animate-stagger-2">
          <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium">
            Click <strong>Run AI Analysis</strong> to generate recommendations based on your team's current workload.
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            The AI engine will assess overloads, overdue tasks, and suggest actions.
          </p>
        </div>
      )}

      {/* Analyzing spinner */}
      {analyzing && (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">AI is analyzing your team's workload…</p>
        </div>
      )}

      {/* Recommendations */}
      {analyzed && !analyzing && (
        <div className="animate-stagger-2">
          {/* Pending */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Pending Actions ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((rec) => (
                  <RecCard
                    key={rec.id}
                    rec={rec}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    approving={approvingId === rec.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Resolved ({done.length})
              </h2>
              <div className="space-y-3">
                {done.map((rec) => (
                  <RecCard
                    key={rec.id}
                    rec={rec}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    approving={approvingId === rec.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}