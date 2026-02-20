import { useState } from "react";
import { Plus, Target, Users, User, X, Save } from "lucide-react";
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220 14% 93%)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(191 91% 37%)" strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.25,0.46,0.45,0.94)" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        fill="hsl(191 91% 30%)" fontSize={size > 70 ? 14 : 11} fontWeight="700"
        style={{ transform: `rotate(90deg) translateX(${size / 2}px) translateY(-${size / 2}px)` }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function Goals() {
  const { goals, loading, addGoal, updateGoal } = useGoals();
  const { employees } = useEmployees();
  const [showAdd, setShowAdd] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateVal, setUpdateVal] = useState("");
  const [form, setForm] = useState({ title: "", type: "individual" as GoalType, target_value: 100, current_value: 0, deadline: "", assigned_to: "" });
  const [filter, setFilter] = useState<"all" | GoalType>("all");

  const filtered = filter === "all" ? goals : goals.filter(g => g.type === filter);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.deadline) { toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" }); return; }
    await addGoal(form);
    setShowAdd(false);
    setForm({ title: "", type: "individual", target_value: 100, current_value: 0, deadline: "", assigned_to: "" });
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
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">New Goal</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Goal Title</label>
                <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
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
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleAdd} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((goal, i) => {
          const pct = goal.target_value ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
          return (
            <div key={goal.id} className={`bg-card rounded-2xl border border-border/60 p-5 card-hover animate-stagger-${Math.min(i + 1, 5)}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <ProgressCircle pct={Math.min(pct, 100)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {goal.type === "team" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                        <Users className="w-3 h-3" /> Team
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <User className="w-3 h-3" /> Individual
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{goal.title}</h3>
                  {goal.assigned_to && <p className="text-xs text-muted-foreground">{goal.assigned_to}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {goal.current_value} / {goal.target_value} · Due {new Date(goal.deadline).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                {updating === goal.id ? (
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      value={updateVal} onChange={e => setUpdateVal(e.target.value)} placeholder="New current value" autoFocus />
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
