import { useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Mail } from "lucide-react";
import { employees as initialEmployees, Employee, projects, customers, standaloneTasksList } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

const allTasks = [...projects.flatMap(p => p.tasks), ...customers.flatMap(c => c.tasks), ...standaloneTasksList];

const gradients = [
  "from-cyan-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
];

export default function Team() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", position: "", email: "", role: "employee" });

  const getStats = (name: string) => {
    const myTasks = allTasks.filter(t => t.assignedTo.includes(name));
    const done = myTasks.filter(t => t.status === "Done").length;
    return { total: myTasks.length, done, pct: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 };
  };

  const save = () => {
    if (!form.name.trim() || !form.position.trim() || !form.email.trim()) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" }); return;
    }
    if (editing) {
      setEmployees(prev => prev.map(e => e.id === editing.id ? { ...editing, ...form } : e));
      toast({ title: "Employee updated!" });
    } else {
      setEmployees(prev => [...prev, { id: Date.now().toString(), ...form }]);
      toast({ title: "Employee added!" });
    }
    setShowAdd(false);
    setEditing(null);
    setForm({ name: "", position: "", email: "", role: "employee" });
  };

  const startEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, position: emp.position, email: emp.email, role: emp.role });
    setShowAdd(true);
  };

  const remove = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast({ title: "Employee removed" });
  };

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{employees.length} team members</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: "", position: "", email: "", role: "employee" }); }}
          className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Employee</button>
      </div>

      {/* Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editing ? "Edit Employee" : "Add Employee"}</h3>
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Full Name", key: "name", placeholder: "Full name..." },
                { label: "Position", key: "position", placeholder: "e.g. Community Support" },
                { label: "Email", key: "email", placeholder: "email@example.com" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{f.label}</label>
                  <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editing ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employees.map((emp, i) => {
          const stats = getStats(emp.name);
          const grad = gradients[i % gradients.length];
          return (
            <div key={emp.id} className={`bg-card rounded-2xl border border-border/60 p-5 card-hover animate-stagger-${Math.min(i + 1, 5)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-lg font-bold avatar-hover flex-shrink-0`}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{emp.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.position}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(emp)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => remove(emp.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <a href={`mailto:${emp.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-4">
                <Mail className="w-3.5 h-3.5" /> {emp.email}
              </a>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Task progress</span>
                  <span className="font-semibold text-foreground">{stats.done}/{stats.total}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${stats.pct}%` }} /></div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.total} total tasks</span>
                  <span className="font-bold text-primary">{stats.pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
