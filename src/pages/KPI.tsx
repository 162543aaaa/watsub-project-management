import { useState } from "react";
import {
  BarChart2, Plus, Save, Trash2, Pencil, X, ChevronDown, ChevronUp,
  ClipboardList, Star, CheckCircle2, AlertCircle, User
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  useKpiTemplates, useKpiCriteria, useKpiEvaluations,
  MEASUREMENT_TYPES, KpiTemplate, KpiCriteria, KpiEvaluation
} from "@/hooks/useKPI";
import { useEmployees } from "@/hooks/useEmployees";
import EmployeeAvatar from "@/components/EmployeeAvatar";

type Tab = "templates" | "evaluations" | "reports";

// ─── Score Color ──────────────────────────────────────────────────────────────
function scoreColor(pct: number) {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}
function scoreLabel(pct: number) {
  if (pct >= 90) return "ดีเยี่ยม";
  if (pct >= 80) return "ดี";
  if (pct >= 70) return "พอใช้";
  if (pct >= 60) return "ต้องปรับปรุง";
  return "ต่ำกว่าเกณฑ์";
}
function scoreBg(pct: number) {
  if (pct >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (pct >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

// ─── Template Form ────────────────────────────────────────────────────────────
const emptyTemplate = { name: "", position: "", description: "", period_months: 3 };
const emptyCriteria = { name: "", description: "", measurement_type: "goal", weight: 10, max_score: 10, sort_order: 0 };

function TemplatesTab() {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate } = useKpiTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<KpiTemplate | null>(null);
  const [form, setForm] = useState(emptyTemplate);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Criteria management for expanded template
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<KpiCriteria | null>(null);
  const [criteriaForm, setCriteriaForm] = useState(emptyCriteria);
  const { criteria, addCriteria, updateCriteria, deleteCriteria } = useKpiCriteria(expandedId);

  const openAdd = () => { setEditingTemplate(null); setForm(emptyTemplate); setShowForm(true); };
  const openEdit = (t: KpiTemplate) => { setEditingTemplate(t); setForm({ name: t.name, position: t.position, description: t.description || "", period_months: t.period_months }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.position.trim()) { toast({ title: "กรุณากรอกชื่อและตำแหน่งงาน", variant: "destructive" }); return; }
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, form);
    } else {
      await addTemplate(form);
    }
    setShowForm(false);
  };

  const openAddCriteria = () => {
    setEditingCriteria(null);
    setCriteriaForm({ ...emptyCriteria, sort_order: criteria.length });
    setShowCriteriaForm(true);
  };
  const openEditCriteria = (c: KpiCriteria) => {
    setEditingCriteria(c);
    setCriteriaForm({ name: c.name, description: c.description || "", measurement_type: c.measurement_type, weight: c.weight, max_score: c.max_score, sort_order: c.sort_order });
    setShowCriteriaForm(true);
  };
  const handleSaveCriteria = async () => {
    if (!expandedId) return;
    if (!criteriaForm.name.trim()) { toast({ title: "กรุณาระบุชื่อเกณฑ์", variant: "destructive" }); return; }
    if (editingCriteria) {
      await updateCriteria(editingCriteria.id, criteriaForm);
    } else {
      await addCriteria({ ...criteriaForm, template_id: expandedId });
    }
    setShowCriteriaForm(false);
  };

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">กำหนด Template KPI ตามตำแหน่งงาน</p>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> สร้าง Template
        </button>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">ยังไม่มี Template KPI</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary hover:underline">+ สร้าง Template แรก</button>
        </div>
      )}

      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="bg-card rounded-2xl border border-border/60">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(191 91% 37% / 0.1)" }}>
                  <BarChart2 className="w-5 h-5" style={{ color: "hsl(191 91% 45%)" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.position} · ประเมินทุก {t.period_months} เดือน · {t.criteria?.length || 0} เกณฑ์</p>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDelete(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="ml-1 text-muted-foreground">
                  {expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {expandedId === t.id && (
              <div className="px-4 pb-4 border-t border-border/40 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">เกณฑ์การประเมิน</span>
                    {totalWeight !== 100 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> น้ำหนักรวม {totalWeight}% (ควรเป็น 100%)
                      </span>
                    )}
                  </div>
                  <button onClick={openAddCriteria} className="text-xs flex items-center gap-1 text-primary hover:underline">
                    <Plus className="w-3 h-3" /> เพิ่มเกณฑ์
                  </button>
                </div>

                {criteria.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มีเกณฑ์ กด "+ เพิ่มเกณฑ์" เพื่อเริ่มต้น</p>
                )}

                <div className="space-y-2">
                  {criteria.map((c, idx) => {
                    const typeLabel = MEASUREMENT_TYPES.find(m => m.value === c.measurement_type)?.label || c.measurement_type;
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2.5 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                            <p className="text-sm font-medium truncate">{c.name}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-5">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{typeLabel}</span>
                            <span className="text-xs text-muted-foreground">น้ำหนัก {c.weight}%</span>
                            <span className="text-xs text-muted-foreground">คะแนนสูงสุด {c.max_score}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button onClick={() => openEditCriteria(c)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteCriteria(c.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) setShowForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "แก้ไข Template KPI" : "สร้าง Template KPI"}</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูล Template KPI</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">ชื่อ Template</label>
              <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น KPI พนักงานฝ่ายขาย" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">ตำแหน่งงาน</label>
              <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="เช่น Sales Executive, Developer" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">รายละเอียด</label>
              <textarea className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="คำอธิบาย Template..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">รอบการประเมิน</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={form.period_months} onChange={e => setForm({ ...form, period_months: Number(e.target.value) })}>
                <option value={3}>ทุก 3 เดือน (รายไตรมาส)</option>
                <option value={6}>ทุก 6 เดือน (ครึ่งปี)</option>
                <option value={12}>ทุก 12 เดือน (รายปี)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={handleSave} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {editingTemplate ? "อัปเดต" : "สร้าง"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Criteria Form Dialog */}
      <Dialog open={showCriteriaForm} onOpenChange={open => { if (!open) setShowCriteriaForm(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCriteria ? "แก้ไขเกณฑ์ KPI" : "เพิ่มเกณฑ์ KPI"}</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูลเกณฑ์ KPI</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">ชื่อเกณฑ์</label>
              <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={criteriaForm.name} onChange={e => setCriteriaForm({ ...criteriaForm, name: e.target.value })} placeholder="เช่น ยอดขายตามเป้าหมาย" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">วิธีการวัด</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={criteriaForm.measurement_type} onChange={e => setCriteriaForm({ ...criteriaForm, measurement_type: e.target.value })}>
                {MEASUREMENT_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">คำอธิบาย</label>
              <textarea className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                rows={2} value={criteriaForm.description} onChange={e => setCriteriaForm({ ...criteriaForm, description: e.target.value })} placeholder="รายละเอียดเกณฑ์..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">น้ำหนัก (%)</label>
                <input type="number" min={0} max={100} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={criteriaForm.weight} onChange={e => setCriteriaForm({ ...criteriaForm, weight: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">คะแนนสูงสุด</label>
                <input type="number" min={1} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={criteriaForm.max_score} onChange={e => setCriteriaForm({ ...criteriaForm, max_score: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowCriteriaForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={handleSaveCriteria} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {editingCriteria ? "อัปเดต" : "เพิ่ม"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันลบ Template?</DialogTitle>
            <DialogDescription>Template และเกณฑ์ทั้งหมดจะถูกลบถาวร</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={() => { if (confirmDelete) deleteTemplate(confirmDelete); setConfirmDelete(null); }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> ลบ
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Evaluation Form ──────────────────────────────────────────────────────────
const emptyEvalForm = { employee_id: "", template_id: "", evaluator_name: "", period_start: "", period_end: "", notes: "" };

function EvaluationsTab() {
  const { templates } = useKpiTemplates();
  const { employees } = useEmployees();
  const { evaluations, loading, addEvaluation, saveScores, deleteEvaluation } = useKpiEvaluations();
  const [showForm, setShowForm] = useState(false);
  const [evalForm, setEvalForm] = useState(emptyEvalForm);
  const [scoringEval, setScoringEval] = useState<KpiEvaluation | null>(null);
  const [scoreValues, setScoreValues] = useState<Record<string, { score: number; comment: string }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const selectedTemplate = templates.find(t => t.id === evalForm.template_id);

  // Auto-fill template based on employee position
  const handleEmployeeChange = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      const matchingTemplate = templates.find(t => t.position.toLowerCase() === emp.position.toLowerCase());
      setEvalForm(f => ({ ...f, employee_id: employeeId, template_id: matchingTemplate?.id || f.template_id }));
    } else {
      setEvalForm(f => ({ ...f, employee_id: employeeId }));
    }
  };

  const handleCreateEvaluation = async () => {
    if (!evalForm.employee_id || !evalForm.template_id || !evalForm.evaluator_name || !evalForm.period_start || !evalForm.period_end) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" }); return;
    }
    await addEvaluation({ ...evalForm, status: "draft" });
    setShowForm(false);
    setEvalForm(emptyEvalForm);
  };

  const openScoring = (ev: KpiEvaluation) => {
    const initial: Record<string, { score: number; comment: string }> = {};
    if (ev.template?.criteria) {
      for (const c of ev.template.criteria) {
        const existing = ev.scores?.find(s => s.criteria_id === c.id);
        initial[c.id] = { score: existing?.score ?? 0, comment: existing?.comment ?? "" };
      }
    }
    setScoreValues(initial);
    setScoringEval(ev);
  };

  const handleSaveScores = async () => {
    if (!scoringEval) return;
    const scores = Object.entries(scoreValues).map(([criteria_id, v]) => ({ criteria_id, score: v.score, comment: v.comment }));
    const ok = await saveScores(scoringEval.id, scores);
    if (ok) setScoringEval(null);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">สร้างและจัดการการประเมิน KPI ของพนักงาน</p>
        <button onClick={() => { setEvalForm(emptyEvalForm); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> สร้างการประเมิน
        </button>
      </div>

      {evaluations.length === 0 && (
        <div className="text-center py-16">
          <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">ยังไม่มีการประเมิน KPI</p>
        </div>
      )}

      <div className="space-y-3">
        {evaluations.map(ev => {
          const emp = employees.find(e => e.id === ev.employee_id);
          const pct = ev.total_score ?? 0;
          return (
            <div key={ev.id} className="bg-card rounded-2xl border border-border/60 p-4 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {emp ? (
                    <EmployeeAvatar name={emp.name} avatar={emp.avatar} size="sm" index={employees.indexOf(emp)} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground" /></div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{emp?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{emp?.position} · {ev.template?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.period_start).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} – {new Date(ev.period_end).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {ev.status === "completed" ? (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${scoreColor(pct)}`}>{pct.toFixed(1)}%</div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBg(pct)}`}>{scoreLabel(pct)}</span>
                    </div>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold">รอประเมิน</span>
                  )}

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openScoring(ev)} title="กรอกคะแนน"
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(ev.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {ev.status === "completed" && ev.template?.criteria && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="space-y-1.5">
                    {ev.template.criteria.map(c => {
                      const s = ev.scores?.find(sc => sc.criteria_id === c.id);
                      const scorePct = s ? (s.score / c.max_score) * 100 : 0;
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-40 truncate">{c.name}</span>
                          <Progress value={scorePct} className="flex-1 h-1.5" />
                          <span className={`text-xs font-semibold w-14 text-right ${scoreColor(scorePct)}`}>{s?.score ?? 0}/{c.max_score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Evaluation Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) setShowForm(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>สร้างการประเมิน KPI</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูลการประเมิน KPI</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">พนักงาน</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={evalForm.employee_id} onChange={e => handleEmployeeChange(e.target.value)}>
                <option value="">เลือกพนักงาน...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Template KPI</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={evalForm.template_id} onChange={e => setEvalForm({ ...evalForm, template_id: e.target.value })}>
                <option value="">เลือก Template...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.position})</option>)}
              </select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.criteria?.length || 0} เกณฑ์ · รอบประเมิน {selectedTemplate.period_months} เดือน</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">ผู้ประเมิน</label>
              <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={evalForm.evaluator_name} onChange={e => setEvalForm({ ...evalForm, evaluator_name: e.target.value })} placeholder="ชื่อผู้ประเมิน..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">วันเริ่มต้นรอบ</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={evalForm.period_start} onChange={e => setEvalForm({ ...evalForm, period_start: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">วันสิ้นสุดรอบ</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={evalForm.period_end} onChange={e => setEvalForm({ ...evalForm, period_end: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">หมายเหตุ</label>
              <textarea className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                rows={2} value={evalForm.notes} onChange={e => setEvalForm({ ...evalForm, notes: e.target.value })} placeholder="หมายเหตุเพิ่มเติม..." />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={handleCreateEvaluation} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> สร้างการประเมิน
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={!!scoringEval} onOpenChange={open => { if (!open) setScoringEval(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>กรอกคะแนน KPI</DialogTitle>
            <DialogDescription>
              {scoringEval && (() => {
                const emp = employees.find(e => e.id === scoringEval.employee_id);
                return `${emp?.name} · ${scoringEval.template?.name}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {scoringEval?.template?.criteria?.map((c, idx) => {
              const sv = scoreValues[c.id] || { score: 0, comment: "" };
              const typeLabel = MEASUREMENT_TYPES.find(m => m.value === c.measurement_type)?.label;
              return (
                <div key={c.id} className="border border-border/60 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{idx + 1}. {c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground mt-1 inline-block">{typeLabel}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">น้ำหนัก {c.weight}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">คะแนน (0–{c.max_score})</label>
                    <input type="number" min={0} max={c.max_score} step={0.5}
                      className="w-24 px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      value={sv.score}
                      onChange={e => setScoreValues(prev => ({ ...prev, [c.id]: { ...sv, score: Math.min(Number(e.target.value), c.max_score) } }))} />
                    <div className="flex-1">
                      <Progress value={(sv.score / c.max_score) * 100} className="h-2" />
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${scoreColor((sv.score / c.max_score) * 100)}`}>
                      {Math.round((sv.score / c.max_score) * 100)}%
                    </span>
                  </div>
                  <input className="w-full mt-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="ความคิดเห็น..."
                    value={sv.comment}
                    onChange={e => setScoreValues(prev => ({ ...prev, [c.id]: { ...sv, comment: e.target.value } }))} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setScoringEval(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={handleSaveScores} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> บันทึกคะแนน
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันลบการประเมิน?</DialogTitle>
            <DialogDescription>ข้อมูลการประเมินและคะแนนทั้งหมดจะถูกลบถาวร</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={() => { if (confirmDelete) deleteEvaluation(confirmDelete); setConfirmDelete(null); }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> ลบ
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const { evaluations, loading } = useKpiEvaluations();
  const { employees } = useEmployees();

  const completed = evaluations.filter(e => e.status === "completed");

  // Group by employee
  const byEmployee = employees.map(emp => {
    const evals = completed.filter(e => e.employee_id === emp.id);
    const avg = evals.length > 0 ? evals.reduce((s, e) => s + (e.total_score ?? 0), 0) / evals.length : null;
    return { emp, evals, avg };
  }).filter(x => x.evals.length > 0);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (completed.length === 0) {
    return (
      <div className="text-center py-16">
        <BarChart2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">ยังไม่มีผลการประเมินที่เสร็จสมบูรณ์</p>
        <p className="text-xs text-muted-foreground mt-1">สร้างการประเมินและกรอกคะแนนเพื่อดูรายงาน</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "การประเมินทั้งหมด", value: evaluations.length, sub: "รายการ" },
          { label: "ประเมินเสร็จแล้ว", value: completed.length, sub: "รายการ" },
          { label: "คะแนนเฉลี่ย", value: completed.length > 0 ? (completed.reduce((s, e) => s + (e.total_score ?? 0), 0) / completed.length).toFixed(1) + "%" : "-", sub: "รวมทุกคน" },
          { label: "พนักงานที่ถูกประเมิน", value: new Set(completed.map(e => e.employee_id)).size, sub: "คน" },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-2xl border border-border/60 p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Per Employee */}
      <div>
        <h3 className="text-sm font-semibold mb-3">ผลการประเมินรายบุคคล</h3>
        <div className="space-y-3">
          {byEmployee.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)).map(({ emp, evals, avg }) => (
            <div key={emp.id} className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar name={emp.name} avatar={emp.avatar} size="sm" index={employees.indexOf(emp)} />
                  <div>
                    <p className="font-semibold text-sm">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.position}</p>
                  </div>
                </div>
                {avg !== null && (
                  <div className="text-right">
                    <div className={`text-xl font-bold ${scoreColor(avg)}`}>{avg.toFixed(1)}%</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBg(avg)}`}>{scoreLabel(avg)}</span>
                  </div>
                )}
              </div>
              <Progress value={avg ?? 0} className="h-2 mb-2" />
              <div className="flex gap-2 flex-wrap">
                {evals.map(ev => (
                  <div key={ev.id} className="text-xs bg-muted rounded-lg px-2 py-1">
                    {new Date(ev.period_start).toLocaleDateString("th-TH", { month: "short", year: "2-digit" })} – {new Date(ev.period_end).toLocaleDateString("th-TH", { month: "short", year: "2-digit" })}:
                    <span className={`ml-1 font-semibold ${scoreColor(ev.total_score ?? 0)}`}>{ev.total_score?.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KPI() {
  const [tab, setTab] = useState<Tab>("templates");

  const tabs: { id: Tab; label: string }[] = [
    { id: "templates", label: "Templates KPI" },
    { id: "evaluations", label: "การประเมิน" },
    { id: "reports", label: "รายงาน" },
  ];

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">ระบบ KPI</h1>
          <p className="text-sm text-muted-foreground mt-0.5">วัดผลการปฏิบัติงานตามตำแหน่งงาน</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 animate-stagger-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-stagger-3">
        {tab === "templates" && <TemplatesTab />}
        {tab === "evaluations" && <EvaluationsTab />}
        {tab === "reports" && <ReportsTab />}
      </div>
    </div>
  );
}
