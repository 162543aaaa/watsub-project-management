import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle2, Clock, ChevronRight, Pencil, Trash2, AlertTriangle, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKpiPeriods, useKpiEvaluations } from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getEligiblePeerReviewers, getSelfEvaluationType, resolveRoleKey } from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const avatarUrl = (p?: string) =>
  !p ? null : p.startsWith("http") ? p : `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${p}`;
const getReviewType = (e: { reviewer_type?: string | null; type?: string | null }) =>
  (e.reviewer_type ?? e.type ?? "").toLowerCase();

function Avatar({ emp }: { emp: Employee }) {
  const url = avatarUrl(emp.avatar);
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
      {url
        ? <img src={url} alt={emp.name} className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-primary">{emp.name.charAt(0)}</span>}
    </div>
  );
}

function Badge({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function KpiOverview() {
  const { isAdmin, user } = useAuthContext();
  const { periods, loading } = useKpiPeriods();
  const { evaluations, refetch } = useKpiEvaluations();
  const { employees } = useEmployees();

  const [me, setMe] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Resolve current user → employee record
  useEffect(() => {
    if (!user || !employees.length) return;
    supabase.from("employees").select("*").eq("email", user.email ?? "").maybeSingle()
      .then(({ data }) => {
        if (data) { setMe(data as Employee); return; }
        const dn = (user.user_metadata?.display_name ?? "").toLowerCase();
        const match = employees.find(e => e.name.toLowerCase() === dn);
        if (match) setMe(match);
      });
  }, [user, employees]);

  const openPeriods = useMemo(() => periods.filter(p => p.status === "open"), [periods]);

  const periodData = useMemo(() => openPeriods.map(period => {
    const pEvals = evaluations.filter(e => e.period_id === period.id);
    const submitted = pEvals.filter(e => e.submitted_at).length;

    const rows = employees.map(emp => {
      const selfType = getSelfEvaluationType(resolveRoleKey(emp));
      const selfDone  = pEvals.some(e => e.evaluatee_id === emp.id && e.evaluator_id === emp.id && getReviewType(e) === selfType && e.submitted_at);
      const supDone   = pEvals.some(e => e.evaluatee_id === emp.id && getReviewType(e) === "supervisor" && e.submitted_at);
      const eligiblePeers = getEligiblePeerReviewers(emp, employees);
      const peersTotal = eligiblePeers.length;
      const peersDone  = eligiblePeers
        .filter(peer => pEvals.some(e => e.evaluator_id === peer.id && e.evaluatee_id === emp.id && getReviewType(e) === "peer" && e.submitted_at))
        .length;

      const meIsDirector = me ? me.role?.toLowerCase().includes("director") : false;

      // My evaluation(s) for this evaluatee
      const myEval = me && !meIsDirector
        ? pEvals.find(e => e.evaluator_id === me.id && e.evaluatee_id === emp.id)
        : null;
      const myPeerEval = me && meIsDirector && me.id !== emp.id
        ? pEvals.find(e => e.evaluator_id === me.id && e.evaluatee_id === emp.id && getReviewType(e) === "peer")
        : null;
      const mySupEval = me && meIsDirector && me.id !== emp.id
        ? pEvals.find(e => e.evaluator_id === me.id && e.evaluatee_id === emp.id && getReviewType(e) === "supervisor")
        : null;

      // My role when evaluating this person
      let myRole: string | null = null;
      if (me) {
        if (me.id === emp.id) myRole = "ตนเอง";
        else if (meIsDirector) myRole = "หัวหน้า+เพื่อน";
        else myRole = "เพื่อน";
      }

      return { emp, selfDone, supDone, peersDone, peersTotal, myEval, myPeerEval, mySupEval, myRole };
    });

    return { period, rows, submitted };
  }), [openPeriods, evaluations, employees, me]);

  // Notify ต้า when all evaluations for a period are complete
  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!me) return;
    const isTa = resolveRoleKey(me) === "ta" || me.role?.toLowerCase().includes("director") || me.role?.toLowerCase().includes("admin");
    if (!isTa) return;

    for (const { period, rows } of periodData) {
      if (notifiedRef.current.has(period.id)) continue;
      const expectedTotal = rows.reduce((sum, r) => sum + 2 + r.peersTotal, 0);
      const completedTotal = rows.reduce(
        (sum, r) => sum + (r.selfDone ? 1 : 0) + (r.supDone ? 1 : 0) + r.peersDone, 0,
      );
      if (expectedTotal > 0 && completedTotal >= expectedTotal) {
        notifiedRef.current.add(period.id);
        toast({
          title: `การประเมินครบแล้ว — ${period.label}`,
          description: "ทุกคนส่งการประเมินครบแล้ว เข้าไปดู Report ได้เลย",
        });
      }
    }
  }, [periodData, me]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("kpi_evaluations").delete().eq("id", confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    if (error) toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    else { toast({ title: "ลบการประเมินแล้ว" }); refetch(); }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

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

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-sm">ยืนยันการลบ</p>
                <p className="text-xs text-muted-foreground">การประเมิน: {confirmDelete.name}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">การลบจะไม่สามารถย้อนกลับได้</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-destructive disabled:opacity-60 transition-opacity"
              >
                {deleting ? "กำลังลบ..." : "ลบ"}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted/50 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No open periods */}
      {openPeriods.length === 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">ไม่มีรอบการประเมินที่เปิดอยู่ในขณะนี้</p>
          {isAdmin && (
            <Link to="/kpi/admin">
              <button className="mt-4 btn-primary text-sm px-4 py-2 rounded-lg">สร้างรอบประเมินใหม่</button>
            </Link>
          )}
        </div>
      )}

      {/* Periods */}
      <div className="space-y-6">
        {periodData.map(({ period, rows, submitted }) => (
          <div key={period.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            {/* Period header */}
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3"
              style={{ background: "hsl(191 91% 37% / 0.04)" }}>
              <div>
                <h2 className="font-semibold text-base">{period.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {period.type === "project" ? "ประเมินโปรเจกต์" : "ประเมินรายไตรมาส"}
                  {" · "}ส่งแล้ว {submitted} รายการ
                </p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)" }}>
                เปิดอยู่
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/30">
              {rows.map(({ emp, selfDone, supDone, peersDone, peersTotal, myEval, myPeerEval, mySupEval, myRole }) => (
                <div key={emp.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Employee info */}
                  <div className="flex items-center gap-3 sm:w-44 flex-shrink-0">
                    <Avatar emp={emp} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    <Badge done={selfDone} label="ตนเอง" />
                    <Badge done={peersDone === peersTotal && peersTotal > 0} label={`เพื่อน ${peersDone}/${peersTotal}`} />
                    <Badge done={supDone} label="หัวหน้า" />
                  </div>

                  {/* My action */}
                  {myRole && myRole === "หัวหน้า+เพื่อน" ? (
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {(["supervisor", "peer"] as const).map((evalType) => {
                        const label = evalType === "supervisor" ? "หัวหน้า" : "เพื่อน";
                        const ev = evalType === "supervisor" ? mySupEval : myPeerEval;
                        return (
                          <div key={evalType} className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{label}:</span>
                            {ev?.submitted_at ? (
                              <>
                                <span className="flex items-center gap-1 text-xs font-medium text-success">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> ส่งแล้ว
                                </span>
                                <Link to={`/kpi/evaluate/${emp.id}/${period.id}?type=${evalType}`}>
                                  <button className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </Link>
                                <button
                                  onClick={() => setConfirmDelete({ id: ev.id, name: `${emp.name} (${label})` })}
                                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <Link to={`/kpi/evaluate/${emp.id}/${period.id}?type=${evalType}`}>
                                <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                                  style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                                  เริ่ม <ChevronRight className="w-3 h-3" />
                                </button>
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : myRole ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">{myRole}:</span>
                      {myEval?.submitted_at ? (
                        <>
                          <span className="flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ส่งแล้ว
                          </span>
                          <Link to={`/kpi/evaluate/${emp.id}/${period.id}`}>
                            <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                              <Pencil className="w-3 h-3" /> แก้ไข
                            </button>
                          </Link>
                          <button
                            onClick={() => setConfirmDelete({ id: myEval.id, name: emp.name })}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <Link to={`/kpi/evaluate/${emp.id}/${period.id}`}>
                          <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                            style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                            เริ่มประเมิน <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
