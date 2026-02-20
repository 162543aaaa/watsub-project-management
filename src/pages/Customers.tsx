import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, ExternalLink, X, Save, DollarSign } from "lucide-react";
import { customers as initialCustomers, employees, Customer, CustomerTask, monthNames } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

function ProgressBar({ tasks }: { tasks: CustomerTask[] }) {
  const done = tasks.filter(t => t.status === "Done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <span className="text-xs font-semibold text-primary w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", detail: "", paymentFee: "", projectTitle: "", note: "", month: 1 });
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");

  const months = [...new Set(customers.map(c => c.month))].sort();
  const filtered = filterMonth === "all" ? customers : customers.filter(c => c.month === filterMonth);
  const grouped: Record<number, Customer[]> = {};
  filtered.forEach(c => { if (!grouped[c.month]) grouped[c.month] = []; grouped[c.month].push(c); });

  const addCustomer = () => {
    if (!form.name.trim()) { toast({ title: "กรุณากรอกชื่อลูกค้า", variant: "destructive" }); return; }
    const cust: Customer = { id: Date.now().toString(), ...form, tasks: [] };
    setCustomers(prev => [...prev, cust]);
    setForm({ name: "", detail: "", paymentFee: "", projectTitle: "", note: "", month: 1 });
    setShowAdd(false);
    toast({ title: "Customer added!" });
  };

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customers.length} clients managed</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Customer
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 animate-stagger-2 flex-wrap">
        <button onClick={() => setFilterMonth("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterMonth === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>All</button>
        {months.map(m => (
          <button key={m} onClick={() => setFilterMonth(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterMonth === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {monthNames[m]}
          </button>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in overflow-y-auto max-h-[90vh]" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">New Customer</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Customer Name", key: "name", placeholder: "Customer name..." },
                { label: "Project Title", key: "projectTitle", placeholder: "Project title..." },
                { label: "Payment Fee", key: "paymentFee", placeholder: "e.g. 25000" },
                { label: "Detail", key: "detail", placeholder: "Project details..." },
                { label: "Note", key: "note", placeholder: "Notes..." },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{f.label}</label>
                  <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Month</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.month} onChange={e => setForm({ ...form, month: Number(e.target.value) })}>
                  {monthNames.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={addCustomer} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Add</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([month, custs]) => (
          <div key={month} className="animate-stagger-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-success flex items-center justify-center text-white text-xs font-bold">{monthNames[Number(month)]?.slice(0, 3)}</div>
              <h2 className="text-lg font-bold text-foreground">{monthNames[Number(month)]} 2026</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{custs.length} customers</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {custs.map(cust => (
                <div key={cust.id} className="bg-card rounded-2xl border border-border/60 p-5 card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">{cust.name}</h3>
                        {cust.paymentFee && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 35%)" }}>
                            <DollarSign className="w-2.5 h-2.5" />{cust.paymentFee}
                          </span>
                        )}
                      </div>
                      {cust.projectTitle && <p className="text-xs text-muted-foreground mt-0.5">{cust.projectTitle}</p>}
                      {cust.detail && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cust.detail}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{cust.tasks.length} tasks</span>
                  </div>
                  {cust.tasks.length > 0 && <ProgressBar tasks={cust.tasks} />}
                  <button onClick={() => setExpanded(prev => ({ ...prev, [cust.id]: !prev[cust.id] }))}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-3">
                    {expanded[cust.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expanded[cust.id] ? "Hide" : "Show"} tasks
                  </button>
                  {expanded[cust.id] && (
                    <div className="mt-3 space-y-2">
                      {cust.tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No tasks yet</p>
                      ) : cust.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                          <span className="text-xs font-medium text-foreground flex-1 truncate">{task.name}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {task.link && <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><ExternalLink className="w-3 h-3" /></a>}
                            <span className={task.status === "Done" ? "badge-done" : task.status === "In Progress" ? "badge-progress" : "badge-todo"}>{task.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
