import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle2, Clock, ChevronRight, ClipboardList, Users } from "lucide-react";
import { useKpiPeriods, useKpiEvaluations } from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
function getAvatarUrl(path: string | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${path}`;
}

function Avatar({ emp, size = 8 }: { emp: Employee; size?: number }) {
  const url = getAvatarUrl(emp.avatar);
  const cls = `w-${size} h-${size} rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center`;
  return (
    <div className={cls}>
      {url
        ? <img src={url} alt={emp.name} className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-primary">{emp.name.charAt(0)}</span>
      }
    </div>
  );
}

export default function KpiOverview() {
  const { periods, loading: periodsLoading } = useKpiPeriods();
  const { evaluations } = useKpiEvaluations();
  const { employees } = useEmployees();
  const { isAdmin, user } = useAuthContext();

  // Resolve current user's employee record
  const [meEmp, setMeEmp] = useState<Employee | null>(null);
  useEffect(() => {
    if (!user || employees.length === 0) return;
    supabase.from("employees").select("*").eq("email", user.email ?? "").maybeSingle()
      .then(({ data }) => {
        if (data) { setMeEmp(data as Employee); return; }
        const displayName = (user.user_metadata?.display_name ?? "").toLowerCase();
        const matched = employees.find(e => e.name.toLowerCase() === displayName);
        if (matched) setMeEmp(matched);
      });
  }, [user, employees]);

  const openPeriods = useMemo(() => periods.filter(p => p.status === "open"), [periods]);

  // "ต้องประเมิน" — tasks pending for current user across all open periods
  const myPendingTasks = useMemo(() => {
    if (!meEmp) return [];
    const tasks: { period: typeof openPeriods[number]; evaluatee: Employee; done: boolean }[] = [];
    for (const period of openPeriods) {
      const periodEvals = evaluations.filter(e => e.period_id === period.id);
      // Everyone to evaluate: self + all peers; supervisor evaluates everyone
      const targets = employees; // simplified: show all
      for (const emp of targets) {
        const evalType =
          emp.id === meEmp.id ? "self"
          : meEmp.role?.toLowerCase().includes("director") ? "supervisor"
          : "peer";
        const done = periodEvals.some(
          e => e.evaluator_id === meEmp.id && e.evaluatee_id === emp.id && e.submitted_at
        );
        tasks.push({ period, evaluatee: emp, done });
      }
    }
    return tasks;
  }, [meEmp, openPeriods, evaluations, employees]);

  const pendingCount = myPendingTasks.filter(t => !t.done).length;

  // Team status per open period
  const periodSubmissions = useMemo(() => {
    return openPeriods.map(period => {
      const periodEvals = evaluations.filter(e => e.period_id === period.id);
      const total = employees.length * 2; // self + supervisor per person (simplified)
      const submitted = periodEvals.filter(e => e.submitted_at).length;
      return {
        period,
        submitted,
        memberStatus: employees.map(emp => {
          const selfDone = periodEvals.some(e => e.evaluatee_id === emp.id && e.evaluator_id === emp.id && e.type === "self" && e.submitted_at);
          const peersDone = employees.filter(p => p.id !== emp.id)
            .filter(peer => periodEvals.some(e => e.evaluator_id === peer.id && e.evaluatee_id === emp.id && e.type === "peer" && e.submitted_at)).length;
          const peersTotal = employees.length - 1;
          const supervisorDone = periodEvals.some(e => e.evaluatee_id === emp.id && e.type === "supervisor" && e.submitted_at);
          return { emp, selfDone, peersDone, peersTotal, supervisorDone };
        }),
      };
    });
  }, [openPeriods, evaluations, employees]);

  if (periodsLoading) {
    return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">KPI Overview</h1>
            <p className="text-sm text-muted-foreground">ภาพรวมการประเมินประสิทธิภาพทีม</p>
          </div>
        </div>
        {isAdmin && (
          <Link to="/kpi/admin">
            <button className="btn-primary text-sm px-4 py-2 rounded-lg">จัดการรอบประเมิน</button>
          </Link>
        )}
      </div>

      {openPeriods.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">ไม่มีรอบการประเมินที่เปิดอยู่ในขณะนี้</p>
          {isAdmin && (
            <Link to="/kpi/admin">
              <button className="mt-4 btn-primary text-sm px-4 py-2 rounded-lg">สร้างรอบประเมินใหม่</button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── ต้องประเมิน (My Tasks) ── */}
          {meEmp && (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3" style={{ background: "hsl(191 91% 37% / 0.06)" }}>
                <ClipboardList className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <h2 className="font-semibold text-base">งานที่ต้องประเมิน</h2>
                  <p className="text-xs text-muted-foreground">ในฐานะ: {meEmp.name}</p>
                </div>
                {pendingCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(0 84% 60% / 0.12)", color: "hsl(0 84% 50%)" }}>
                    รอดำเนินการ {pendingCount}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border/30">
                {myPendingTasks.map(({ period, evaluatee, done }) => {
                  const evalType =
                    evaluatee.id === meEmp.id ? "ตนเอง"
                    : meEmp.role?.toLowerCase().includes("director") ? "หัวหน้า"
                    : "เพื่อน";
                  return (
                    <div key={`${period.id}-${evaluatee.id}`}
                      className="px-5 py-3 flex items-center gap-3">
                      <Avatar emp={evaluatee} size={8} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{evaluatee.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{evaluatee.position} · {period.label}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "hsl(215 14% 60% / 0.12)", color: "hsl(215 14% 45%)" }}>
                        {evalType}
                      </span>
                      {done ? (
                        <span className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
                          style={{ color: "hsl(142 71% 40%)" }}>
                          <CheckCircle2 className="w-4 h-4" /> ส่งแล้ว
                        </span>
                      ) : (
                        <Link to={`/kpi/evaluate/${evaluatee.id}/${period.id}`}>
                          <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                            เริ่มประเมิน <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── สถานะการประเมินของทีม ── */}
          {periodSubmissions.map(({ period, submitted, memberStatus }) => (
            <div key={period.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3" style={{ background: "hsl(222 47% 11% / 0.04)" }}>
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <h2 className="font-semibold text-base">{period.label}</h2>
                  <p className="text-xs text-muted-foreground">
                    {period.type === "project" ? "ประเมินโปรเจกต์" : "ประเมินรายไตรมาส"} · ส่งแล้ว {submitted} รายการ
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)" }}>
                  เปิดอยู่
                </span>
              </div>

              <div className="divide-y divide-border/30">
                {memberStatus.map(({ emp, selfDone, peersDone, peersTotal, supervisorDone }) => (
                  <div key={emp.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar emp={emp} size={8} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge done={selfDone} label="ตนเอง" />
                      <StatusBadge done={peersDone === peersTotal && peersTotal > 0} label={`เพื่อน ${peersDone}/${peersTotal}`} />
                      <StatusBadge done={supervisorDone} label="หัวหน้า" />
                    </div>
                    <Link to={`/kpi/evaluate/${emp.id}/${period.id}`}>
                      <button className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
                        style={{ background: "hsl(191 91% 37% / 0.10)", color: "hsl(191 91% 40%)" }}>
                        ประเมิน <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {label}
    </span>
  );
}
