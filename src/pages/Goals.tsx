import { useState } from "react";
import { Plus, Target, Users, User, X, Save, Trash2, Pencil } from "lucide-react";
import { useGoals, Goal } from "@/hooks/useGoals";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "@/hooks/use-toast";

type GoalType = "individual" | "team";

function ProgressCircle({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.25,0.46,0.45,0.94)" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        fill="hsl(var(--primary))" fontSize={size > 70 ? 14 : 11} fontWeight="700"
        style={{ transform: `rotate(90deg) translateX(${size / 2}px) translateY(-${size / 2}px)` }}>
        {pct}%
      </text>
    </svg>
  );
}

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

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={() => { setShowAdd(false); setEditingGoal(null); }}>
          <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingGoal ? "Edit Goal" : "New Goal"}</h3>
              <button onClick={() => { setShowAdd(false); setEditingGoal(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
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
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowAdd(false); setEditingGoal(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {editingGoal ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }}>
            <h3 className="text-lg font-bold mb-2">ยืนยันลบเป้าหมาย?</h3>
            <p className="text-sm text-muted-foreground mb-5">เป้าหมายนี้จะถูกลบถาวรและไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No goals found</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary hover:underline">+ Add your first goal</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((goal, i) => {
          const pct = goal.target_value ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
          return (
            <div key={goal.id} className={`bg-card rounded-2xl border border-border/60 p-5 card-hover group animate-stagger-${Math.min(i + 1, 5)}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <ProgressCircle pct={Math.min(pct, 100)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {goal.type === "team" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        <Users className="w-3 h-3" /> Team
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <User className="w-3 h-3" /> Individual
                      </span>
                    )}
                    {/* Edit & Delete buttons */}
                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(goal)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(goal.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{goal.title}</h3>
                  {goal.assigned_to && <p className="text-xs text-muted-foreground">{goal.assigned_to}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {goal.current_value} / {goal.target_value} · Due {new Date(goal.deadline).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                {updating === goal.id ? (
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      value={updateVal} onChange={e => setUpdateVal(e.target.value)} placeholder="New current value" autoFocus
                      onKeyDown={e => { if (e.key === "Enter") updateProgress(goal.id); if (e.key === "Escape") setUpdating(null); }} />
                    <button onClick={() => updateProgress(goal.id)} className="btn-primary px-3 py-1.5 text-sm">Save</button>
                    <button onClick={() => setUpdating(null)} className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"><X className="w-4 h-4" /></button>
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
