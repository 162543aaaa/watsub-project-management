import { useState, useMemo } from "react";
import { Plus, Target, Save, Trash2, Pencil, X, ChevronDown, ChevronRight, CalendarDays, TrendingUp, User } from "lucide-react";
import { useOKRs } from "@/hooks/useOKRs";
import { useEmployees } from "@/hooks/useEmployees";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { Objective, KeyResult } from "@/types";
// ── OKR Confidence Helpers ────────────────────────────────────────────────────

function getQuarterDates(period: string): { start: Date; end: Date; totalDays: number } | null {
  const match = period.match(/Q([1-4])\s+(\d{4})/);
  if (!match) return null;
  const q = Number(match[1]);
  const year = Number(match[2]);
  const starts = [new Date(year, 0, 1), new Date(year, 3, 1), new Date(year, 6, 1), new Date(year, 9, 1)];
  const ends   = [new Date(year, 2, 31), new Date(year, 5, 30), new Date(year, 8, 30), new Date(year, 11, 31)];
  const start = starts[q - 1];
  const end   = ends[q - 1];
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return { start, end, totalDays };
}

interface ConfidenceInfo { projectedFinal: number; daysElapsed: number; totalDays: number; isAtRisk: boolean }

function getConfidence(pct: number, period: string): ConfidenceInfo | null {
  const dates = getQuarterDates(period);
  if (!dates) return null;
  const { start, end, totalDays } = dates;
  const now = new Date();
  if (now < start) return { projectedFinal: 100, daysElapsed: 0, totalDays, isAtRisk: false };
  const daysElapsed = Math.min(Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), totalDays);
  const projectedFinal = daysElapsed > 0 ? Math.min(Math.round((pct / daysElapsed) * totalDays), 100) : (pct > 0 ? 100 : 0);
  const isAtRisk = now <= end && projectedFinal < 100 && pct < 100;
  return { projectedFinal, daysElapsed, totalDays, isAtRisk };
}

const currentYear = new Date().getFullYear();
const yearOptions = [2025, 2026, 2027];
const quarterOptions = ["All", "Q1", "Q2", "Q3", "Q4"] as const;

const emptyObjForm = { title: "", period: "", year: currentYear, owner_id: "", status: "active" };
const emptyKRForm = { title: "", initial_value: 0, target_value: 100, current_value: 0, unit: "%" };

export default function OKRs() {
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterQuarter, setFilterQuarter] = useState("All");
  const { objectives, isLoading, addObjective, addKeyResult, updateKeyResult, updateObjective, deleteObjective, deleteKeyResult, getProgress } = useOKRs(filterYear);
  const { employees } = useEmployees();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showObjDialog, setShowObjDialog] = useState(false);
  const [editingObj, setEditingObj] = useState<Objective | null>(null);
  const [objForm, setObjForm] = useState(emptyObjForm);

  const [showKRDialog, setShowKRDialog] = useState(false);
  const [krParentId, setKrParentId] = useState<string | null>(null);
  const [krForm, setKrForm] = useState(emptyKRForm);

  const [editKR, setEditKR] = useState<string | null>(null);
  const [editKRVal, setEditKRVal] = useState("");

  const [confirmDeleteObj, setConfirmDeleteObj] = useState<string | null>(null);
  const [confirmDeleteKR, setConfirmDeleteKR] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filterQuarter === "All") return objectives;
    return objectives.filter(o => o.period.startsWith(filterQuarter));
  }, [objectives, filterQuarter]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openAddObj = () => { setEditingObj(null); setObjForm({ ...emptyObjForm, year: filterYear }); setShowObjDialog(true); };
  const openEditObj = (obj: Objective) => {
    setEditingObj(obj);
    setObjForm({ title: obj.title, period: obj.period, year: obj.year, owner_id: obj.owner_id || "", status: obj.status });
    setShowObjDialog(true);
  };

  const saveObj = async () => {
    if (!objForm.title.trim()) { toast({ title: "กรุณากรอกชื่อ Objective", variant: "destructive" }); return; }
    const payload = { ...objForm, owner_id: objForm.owner_id || null };
    if (editingObj) {
      await updateObjective.mutateAsync({ id: editingObj.id, ...payload });
    } else {
      await addObjective.mutateAsync(payload);
    }
    setShowObjDialog(false);
  };

  const openAddKR = (objectiveId: string) => { setKrParentId(objectiveId); setKrForm(emptyKRForm); setShowKRDialog(true); };
  const saveKR = async () => {
    if (!krForm.title.trim() || !krParentId) return;
    await addKeyResult.mutateAsync({ ...krForm, objective_id: krParentId });
    setShowKRDialog(false);
  };

  const startEditKR = (kr: KeyResult) => { setEditKR(kr.id); setEditKRVal(String(kr.current_value)); };
  const saveKRValue = async (id: string) => {
    const val = Number(editKRVal);
    if (isNaN(val)) return;
    await updateKeyResult.mutateAsync({ id, current_value: val });
    setEditKR(null);
  };

  const getOwner = (id: string | null) => employees.find(e => e.id === id);

  if (isLoading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">OKRs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Objectives & Key Results</p>
        </div>
        <button onClick={openAddObj} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Objective
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-stagger-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1">
            {yearOptions.map(y => (
              <button key={y} onClick={() => setFilterYear(y)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterYear === y ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          {quarterOptions.map(q => (
            <button key={q} onClick={() => setFilterQuarter(q)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterQuarter === q ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Objective Dialog */}
      <Dialog open={showObjDialog} onOpenChange={v => { if (!v) setShowObjDialog(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingObj ? "Edit Objective" : "New Objective"}</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูล Objective</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Title</label>
              <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={objForm.title} onChange={e => setObjForm({ ...objForm, title: e.target.value })} placeholder="e.g. Increase customer satisfaction" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Period</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={objForm.period} onChange={e => setObjForm({ ...objForm, period: e.target.value })}>
                  <option value="">Select...</option>
                  {["Q1", "Q2", "Q3", "Q4"].map(q => (
                    <option key={q} value={`${q} ${objForm.year}`}>{q} {objForm.year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Owner</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={objForm.owner_id} onChange={e => setObjForm({ ...objForm, owner_id: e.target.value })}>
                  <option value="">No owner</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={objForm.status} onChange={e => setObjForm({ ...objForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowObjDialog(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={saveObj} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {editingObj ? "Update" : "Create"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Key Result Dialog */}
      <Dialog open={showKRDialog} onOpenChange={v => { if (!v) setShowKRDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Key Result</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูล Key Result</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Title</label>
              <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={krForm.title} onChange={e => setKrForm({ ...krForm, title: e.target.value })} placeholder="e.g. Achieve NPS score of 80" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start</label>
                <input type="number" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={krForm.initial_value} onChange={e => setKrForm({ ...krForm, initial_value: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Target</label>
                <input type="number" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={krForm.target_value} onChange={e => setKrForm({ ...krForm, target_value: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Unit</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={krForm.unit} onChange={e => setKrForm({ ...krForm, unit: e.target.value })} placeholder="%" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowKRDialog(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={saveKR} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Create
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Objective Confirm */}
      <Dialog open={!!confirmDeleteObj} onOpenChange={v => { if (!v) setConfirmDeleteObj(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบ Objective?</DialogTitle>
            <DialogDescription>Objective และ Key Results ทั้งหมดจะถูกลบถาวร</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteObj(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={async () => { if (confirmDeleteObj) { await deleteObjective.mutateAsync(confirmDeleteObj); setConfirmDeleteObj(null); } }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete KR Confirm */}
      <Dialog open={!!confirmDeleteKR} onOpenChange={v => { if (!v) setConfirmDeleteKR(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบ Key Result?</DialogTitle>
            <DialogDescription>Key Result นี้จะถูกลบถาวร</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteKR(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={async () => { if (confirmDeleteKR) { await deleteKeyResult.mutateAsync(confirmDeleteKR); setConfirmDeleteKR(null); } }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No OKRs found for {filterYear}{filterQuarter !== "All" ? ` ${filterQuarter}` : ""}</p>
          <button onClick={openAddObj} className="mt-3 text-sm text-primary hover:underline">+ Add your first Objective</button>
        </div>
      )}

      {/* OKR List */}
      <div className="space-y-4">
        {filtered.map((obj, i) => {
          const pct = getProgress(obj);
          const isExpanded = expanded.has(obj.id);
          const owner = getOwner(obj.owner_id);
          const krs = obj.key_results ?? [];

          return (
            <div key={obj.id} className={`bg-card rounded-2xl border border-border/60 overflow-hidden card-hover animate-stagger-${Math.min(i + 1, 5)}`}>
              {/* Objective Header */}
              <div className="p-5 cursor-pointer group" onClick={() => toggle(obj.id)}>
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 flex-shrink-0 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground leading-snug truncate">{obj.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        obj.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                        obj.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}>{obj.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      {obj.period && <span className="font-medium">{obj.period}</span>}
                      {owner && (
                        <span className="flex items-center gap-1">
                          <EmployeeAvatar name={owner.name} avatar={owner.avatar} size="xs" index={0} />
                          {owner.name}
                        </span>
                      )}
                      <span>{krs.length} Key Result{krs.length !== 1 ? "s" : ""}</span>
                    </div>
                    {(() => {
                      const conf = getConfidence(pct, obj.period ?? "");
                      return (
                        <>
                          <div className="flex items-center gap-3">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className={`text-xs font-bold w-12 text-right ${pct >= 100 ? "text-emerald-600" : "text-primary"}`}>{pct}%</span>
                            {conf && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                                conf.isAtRisk
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              }`}>
                                {conf.isAtRisk ? `⚠ At Risk · proj ${conf.projectedFinal}%` : `On Track · proj ${conf.projectedFinal}%`}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditObj(obj)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDeleteObj(obj.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Key Results (expanded) */}
              {isExpanded && (
                <div className="border-t border-border/40 bg-muted/30">
                  {krs.length === 0 && (
                    <div className="px-12 py-6 text-center text-xs text-muted-foreground">No Key Results yet</div>
                  )}
                  {krs.map(kr => {
                    const range = kr.target_value - kr.initial_value;
                    const krPct = range > 0 ? Math.round(((kr.current_value - kr.initial_value) / range) * 100) : 0;
                    return (
                      <div key={kr.id} className="px-12 py-3 border-b border-border/20 last:border-b-0 group/kr flex items-center gap-3">
                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground truncate">{kr.title}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] text-muted-foreground">{kr.current_value} / {kr.target_value} {kr.unit}</span>
                              <span className={`text-[11px] font-bold ${krPct >= 100 ? "text-emerald-600" : "text-primary"}`}>{krPct}%</span>
                            </div>
                          </div>
                          <Progress value={krPct} className="h-1.5" />
                        </div>
                        {/* Quick edit */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {editKR === kr.id ? (
                            <div className="flex gap-1">
                              <input type="number" className="w-20 px-2 py-1 rounded-lg border border-border bg-background text-xs outline-none"
                                value={editKRVal} onChange={e => setEditKRVal(e.target.value)} autoFocus
                                onKeyDown={e => { if (e.key === "Enter") saveKRValue(kr.id); if (e.key === "Escape") setEditKR(null); }} />
                              <button onClick={() => saveKRValue(kr.id)} className="btn-primary px-2 py-1 text-xs">Save</button>
                              <button onClick={() => setEditKR(null)} className="px-1.5 py-1 rounded-lg border border-border text-xs hover:bg-muted"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => startEditKR(kr)} className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover/kr:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => setConfirmDeleteKR(kr.id)} className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover/kr:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-12 py-3">
                    <button onClick={() => openAddKR(obj.id)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Key Result
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
