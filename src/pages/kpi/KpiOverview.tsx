import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, CheckCircle2, Clock, ChevronRight,
  Pencil, Trash2, AlertTriangle,
} from "lucide-react";
import { useKpiPeriods, useKpiEvaluations } from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
function getAvatarUrl(path: string | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${path}`;
}

function Avatar({ emp }: { emp: Employee }) {
  const url = getAvatarUrl(emp.avatar);
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
      {url
        ? <img src={url} alt={emp.name} className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-primary">{emp.name.charAt(0)}</span>
      }
    </div>
  );
}

export default function KpiOverview() {
  const { periods, loading: periodsLoading } = useKpiPeriods();
  const { evaluations, refetch } = useKpiEvaluations();
  const { employees } = useEmployees();
  const { isAdmin, user } = useAuthContext();

  const [meEmp, setMeEmp] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ evalId: string; name: string } | null>(null);

  useEffect(() => {
    if (!user || employees.length === 0) return;
    supabase.from("employees").select("*").eq("email", user.email ?? "").maybeSingle()
      .then(({ data }) => {
        if (data) { setMeEmp(data as Employee); return; }
        const dn = (user.user_metadata?.display_name ?? "").toLowerCase();
        const match = employees.find(e => e.name.toLowerCase() === dn);
        if (match) setMeEmp(match);
      });
  }, [user, employees]);

  const openPeriods = useMemo(() => periods.filter(p => p.status === "open"), [periods]);

  // Per-period: merged view of team status + my submission
  const periodData = useMemo(() => {
    return openPeriods.map(period => {
      const pEvals = evaluations.filter(e => e.period_id === period.id);
      const rows = employees.map(emp => {
        // Team status badges
        const selfDone   = pEvals.some(e => e.evaluatee_id === emp.id && e.evaluator_id === emp.id && e.type === "self" && e.submitted_at);
        const peersDone  = employees.filter(p => p.id !== emp.id)
          .filter(peer => pEvals.some(e => e.evaluator_id === peer.id && e.evaluatee_id === emp.id && e.type === "peer" && e.submitted_at)).length;
        const supDone    = pEvals.some(e => e.evaluatee_id === emp.id && e.type === "supervisor" && e.submitted_at);

        // My eval for this evaluatee
        const myEval = meEmp
          ? pEvals.find(e => e.evaluator_id === meEmp.id && e.evaluatee_id === emp.id)
          : null;
        const myEvalType =
          !meEmp ? null
          : emp.id === meEmp.id ? "ตนเอง"
          : meEmp.role?.toLowerCase().includes("director") ? "หัวหน้า"
          : "เพื่อน";

        return {
          emp, selfDone, peersDone, peersTotal: employees.length - 1, supDone,
          myEval, myEvalType,
        };
      });
      const totalSubmitted = pEvals.filter(e => e.submitted_at).length;
      return { period, rows, totalSubmitted };
    });
  }, [openPeriods, evaluations, employees, meEmp]);

  const handleDelete = async (evalId: string) => {
    setDeletingId(evalId);
    const { error } = await supabase.from("kpi_evaluations").delete().eq("id", evalId);
    setDeletingId(null);
    setConfirmDelete(null);
    if (error) {
      toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบการประเมินแล้ว" });
      refetch();
    }
  };

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

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(0 84% 60% / 0.12)" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "hsl(0 84% 60%)" }} />
              </div>
              <div>
                <p className="font-semibold text-sm">ยืนยันการลบ</p>
                <p className="text-xs text-muted-foreground">การประเมิน: {confirmDelete.name}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">การลบจะไม่สามารถย้อนกลับได้ คะแนนนี้จะถูกลบออกจากระบบถาวร</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(confirmDelete.evalId)}
                disabled={!!deletingId}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "hsl(0 84% 60%)" }}>
                {deletingId ? "กำลังลบ..." : "ลบ"}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted/50 transition-colors">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

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
          {periodData.map(({ period, rows, totalSubmitted }) => (
            <div key={period.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              {/* Period header */}
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3"
                style={{ background: "hsl(191 91% 37% / 0.04)" }}>
                <div>
                  <h2 className="font-semibold text-base">{period.label}</h2>
                  <p className="text-xs text-muted-foreground">
                    {period.type === "project" ? "ประเมินโปรเจกต์" : "ประเมินรายไตรมาส"}
                    {" · "}ส่งแล้ว {totalSubmitted} รายการ
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)" }}>
                  เปิดอยู่
                </span>
              </div>

              {/* Member rows */}
              <div className="divide-y divide-border/30">
                {rows.map(({ emp, selfDone, peersDone, peersTotal, supDone, myEval, myEvalType }) => (
                  <div key={emp.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Member info */}
                    <div className="flex items-center gap-3 w-48 flex-shrink-0 min-w-0">
                      <Avatar emp={emp} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                      </div>
                    </div>

                    {/* Team status badges */}
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                      <StatusBadge done={selfDone} label="ตนเอง" />
                      <StatusBadge done={peersDone === peersTotal && peersTotal > 0} label={`เพื่อน ${peersDone}/${peersTotal}`} />
                      <StatusBadge done={supDone} label="หัวหน้า" />
                    </div>

                    {/* My action: submit / edit / delete */}
                    {myEvalType && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:block">{myEvalType}:</span>
                        {myEval?.submitted_at ? (
                          <>
                            <span className="flex items-center gap-1 text-xs font-medium"
                              style={{ color: "hsl(142 71% 40%)" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> ส่งแล้ว
                            </span>
                            <Link to={`/kpi/evaluate/${emp.id}/${period.id}`}>
                              <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
                                title="แก้ไขการประเมิน">
                                <Pencil className="w-3 h-3" /> แก้ไข
                              </button>
                            </Link>
                            <button
                              onClick={() => setConfirmDelete({ evalId: myEval.id, name: emp.name })}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                              style={{ borderColor: "hsl(0 84% 60% / 0.3)", color: "hsl(0 84% 55%)" }}
                              title="ลบการประเมิน">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <Link to={`/kpi/evaluate/${emp.id}/${period.id}`}>
                            <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                              style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                              เริ่มประเมิน <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                        )}
                      </div>
                    )}
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
