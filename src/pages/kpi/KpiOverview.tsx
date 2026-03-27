import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { useKpiPeriods, useKpiEvaluations } from "@/hooks/useKpi";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";

export default function KpiOverview() {
  const { periods, loading: periodsLoading } = useKpiPeriods();
  const { evaluations } = useKpiEvaluations();
  const { employees } = useEmployees();
  const { isAdmin } = useAuthContext();

  const openPeriods = useMemo(() => periods.filter(p => p.status === "open"), [periods]);

  // For each period, compute per-member submission status
  const periodSubmissions = useMemo(() => {
    return openPeriods.map(period => {
      const periodEvals = evaluations.filter(e => e.period_id === period.id);
      return {
        period,
        memberStatus: employees.map(emp => {
          const selfDone = periodEvals.some(e => e.evaluatee_id === emp.id && e.evaluator_id === emp.id && e.type === "self" && e.submitted_at);
          const peersDone = employees
            .filter(p => p.id !== emp.id)
            .filter(peer => periodEvals.some(e => e.evaluator_id === peer.id && e.evaluatee_id === emp.id && e.type === "peer" && e.submitted_at))
            .length;
          const peersTotal = employees.length - 1;
          const supervisorDone = periodEvals.some(e => e.evaluatee_id === emp.id && e.type === "supervisor" && e.submitted_at);
          return { emp, selfDone, peersDone, peersTotal, supervisorDone };
        }),
      };
    });
  }, [openPeriods, evaluations, employees]);

  if (periodsLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
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
            <p className="text-sm text-muted-foreground">รอบการประเมินที่เปิดอยู่</p>
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
          {periodSubmissions.map(({ period, memberStatus }) => (
            <div key={period.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              {/* Period header */}
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between"
                style={{ background: "hsl(222 47% 11% / 0.04)" }}>
                <div>
                  <h2 className="font-semibold text-base">{period.label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {period.type === "project" ? "ประเมินโปรเจกต์" : "ประเมินรายไตรมาส"}
                  </span>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)" }}>
                  เปิดอยู่
                </span>
              </div>

              {/* Member rows */}
              <div className="divide-y divide-border/30">
                {memberStatus.map(({ emp, selfDone, peersDone, peersTotal, supervisorDone }) => (
                  <div key={emp.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Member info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
                        {emp.avatar
                          ? <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-primary">{emp.name.charAt(0)}</span>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                      </div>
                    </div>

                    {/* Submission badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${selfDone ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {selfDone ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        ตนเอง
                      </span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${peersDone === peersTotal && peersTotal > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {peersDone === peersTotal && peersTotal > 0 ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        เพื่อน {peersDone}/{peersTotal}
                      </span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${supervisorDone ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {supervisorDone ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        หัวหน้า
                      </span>
                    </div>

                    {/* Evaluate button */}
                    <Link to={`/kpi/evaluate/${emp.id}/${period.id}`}>
                      <button className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
                        style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                        เริ่มประเมิน
                        <ChevronRight className="w-3.5 h-3.5" />
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
