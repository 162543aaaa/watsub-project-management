import { useState } from "react";
import { Plus, Target, Users, User, Save, Trash2, Pencil, X, CheckCircle2 } from "lucide-react";
import { useGoals, Goal } from "@/hooks/useGoals";
import { useEmployees } from "@/hooks/useEmployees";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type GoalType = "individual" | "team";

const emptyForm = { title: "", type: "individual" as GoalType, target_value: 100, current_value: 0, deadline: "", assigned_to: "" };

export default function Goals() {
  const { goals, loading, addGoal, updateGoal, deleteGoal } = useGoals();
  const { employees } = useEmployees();
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateVal, setUpdateVal] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<"all" | GoalType>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = filter === "all" ? goals : goals.filter(g => g.type === filter);

  const openAdd = () => {
    setEditingGoal(null);
    setForm(emptyForm);
    setShowAdd(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      type: goal.type,
      target_value: goal.target_value,
      current_value: goal.current_value,
      deadline: goal.deadline,
      assigned_to: goal.assigned_to || "",
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.deadline) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" });
      return;
    }
    if (editingGoal) {
      await updateGoal(editingGoal.id, form);
    } else {
      await addGoal(form);
    }
    setShowAdd(false);
    setEditingGoal(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    await deleteGoal(id);
    setConfirmDelete(null);
  };

  const updateProgress = async (id: string) => {
    const val = Number(updateVal);
    if (isNaN(val)) return;
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    await updateGoal(id, { current_value: Math.min(val, goal.target_value) });
    setUpdating(null);
    setUpdateVal("");
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track individual and team objectives</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      <div className="flex gap-2 mb-6 animate-stagger-2">
        {(["all", "individual", "team"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {f === "all" ? "All Goals" : f === "individual" ? "Individual" : "Team"}
          </button>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditingGoal(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "New Goal"}</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูลเป้าหมาย</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Goal Title</label>
              <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Describe the goal..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Type</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.type} onChange={e => setForm({ ...form, type: e.target.value as GoalType })}>
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Target Value</label>
                <input type="number" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.target_value} onChange={e => setForm({ ...form, target_value: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Current Value</label>
                <input type="number" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.current_value} onChange={e => setForm({ ...form, current_value: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Deadline</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            {form.type === "individual" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Assigned To</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">Select member...</option>
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => { setShowAdd(false); setEditingGoal(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSave} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {editingGoal ? "Update" : "Create"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันลบเป้าหมาย?</DialogTitle>
            <DialogDescription>เป้าหมายนี้จะถูกลบถาวรและไม่สามารถกู้คืนได้</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={() => confirmDelete && handleDelete(confirmDelete)} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No goals found</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary hover:underline">+ Add your first goal</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((goal, i) => {
          const pct = goal.target_value ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
          const clampedPct = Math.min(pct, 100);
          const isComplete = clampedPct >= 100;
          return (
            <div key={goal.id} className={`bg-card rounded-2xl border border-border/60 p-5 card-hover group animate-stagger-${Math.min(i + 1, 5)} relative`}>
              {/* Header row: badge + actions */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {goal.type === "team" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      <Users className="w-3 h-3" /> Team
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      <User className="w-3 h-3" /> Individual
                    </span>
                  )}
                  {isComplete && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 35%)" }}>
                      <CheckCircle2 className="w-3 h-3" /> Complete
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); openEdit(goal); } }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(goal.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & info */}
              <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{goal.title}</h3>
              {goal.assigned_to && (() => {
                const emp = employees.find(e => e.name === goal.assigned_to);
                return (
                  <div className="flex items-center gap-1.5 mb-2">
                    <EmployeeAvatar name={goal.assigned_to} avatar={emp?.avatar} size="xs" index={employees.indexOf(emp!)} />
                    <p className="text-xs text-muted-foreground">{goal.assigned_to}</p>
                  </div>
                );
              })()}

              {/* Progress bar */}
              <div className="mt-3 mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{goal.current_value} / {goal.target_value}</span>
                  <span className={`text-xs font-bold ${isComplete ? "text-emerald-600" : "text-primary"}`}>{clampedPct}%</span>
                </div>
                <Progress value={clampedPct} className="h-2" />
              </div>

              {/* Deadline */}
              <p className="text-xs text-muted-foreground mt-2">
                Due {new Date(goal.deadline).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
              </p>

              {/* Update progress */}
              <div className="mt-3 pt-3 border-t border-border/40">
                {updating === goal.id ? (
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      value={updateVal} onChange={e => setUpdateVal(e.target.value)} placeholder="New value" autoFocus
                      onKeyDown={e => { if (e.key === "Enter") updateProgress(goal.id); if (e.key === "Escape") setUpdating(null); }} />
                    <button onClick={() => updateProgress(goal.id)} className="btn-primary px-3 py-1.5 text-sm">Save</button>
                    <button onClick={() => setUpdating(null)} className="px-2 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => { setUpdating(goal.id); setUpdateVal(String(goal.current_value)); }}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    <Target className="w-3.5 h-3.5" /> Update Progress
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
