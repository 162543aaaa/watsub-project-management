import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, ExternalLink, X, Save } from "lucide-react";
import { projects as initialProjects, employees, Project, ProjectTask, monthNames } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

function ProgressBar({ tasks }: { tasks: ProjectTask[] }) {
  const done = tasks.filter(t => t.status === "Done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <span className="text-xs font-semibold text-primary w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState(initialProjects);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", month: 1, note: "" });
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");

  const months = [...new Set(projects.map(p => p.month))].sort();
  const filtered = filterMonth === "all" ? projects : projects.filter(p => p.month === filterMonth);
  const grouped: Record<number, Project[]> = {};
  filtered.forEach(p => { if (!grouped[p.month]) grouped[p.month] = []; grouped[p.month].push(p); });

  const addProject = () => {
    if (!newProject.name.trim()) { toast({ title: "กรุณากรอกชื่อโปรเจกต์", variant: "destructive" }); return; }
    const proj: Project = { id: Date.now().toString(), name: newProject.name, month: newProject.month, note: newProject.note, tasks: [], createdAt: new Date().toISOString() };
    setProjects(prev => [...prev, proj]);
    setNewProject({ name: "", month: 1, note: "" });
    setShowAdd(false);
    toast({ title: "Project created!" });
  };

  const getStatusColor = (status: string) => {
    if (status === "Done") return "badge-done";
    if (status === "In Progress") return "badge-progress";
    return "badge-todo";
  };

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} projects across {months.length} months</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 animate-stagger-2 flex-wrap">
        <button onClick={() => setFilterMonth("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterMonth === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
          All
        </button>
        {months.map(m => (
          <button key={m} onClick={() => setFilterMonth(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterMonth === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {monthNames[m]}
          </button>
        ))}
      </div>

      {/* Add Project Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">New Project</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Project Name</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="Project name..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Month</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={newProject.month} onChange={e => setNewProject({ ...newProject, month: Number(e.target.value) })}>
                  {monthNames.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Note</label>
                <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                  value={newProject.note} onChange={e => setNewProject({ ...newProject, note: e.target.value })} placeholder="Optional note..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={addProject} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Projects by month */}
      <div className="space-y-8">
        {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([month, projs]) => (
          <div key={month} className="animate-stagger-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">{monthNames[Number(month)]?.slice(0, 3)}</div>
              <h2 className="text-lg font-bold text-foreground">{monthNames[Number(month)]} 2026</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{projs.length} projects</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projs.map(proj => (
                <div key={proj.id} className="bg-card rounded-2xl border border-border/60 p-5 card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{proj.name}</h3>
                      {proj.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{proj.note}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{proj.tasks.length} tasks</span>
                  </div>
                  {proj.tasks.length > 0 && (
                    <div className="mb-3">
                      <ProgressBar tasks={proj.tasks} />
                    </div>
                  )}
                  <button onClick={() => setExpanded(prev => ({ ...prev, [proj.id]: !prev[proj.id] }))}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2">
                    {expanded[proj.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expanded[proj.id] ? "Hide" : "Show"} tasks
                  </button>
                  {expanded[proj.id] && proj.tasks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {proj.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                          <span className="text-xs font-medium text-foreground flex-1 truncate">{task.name}</span>
                          <div className="flex items-center gap-1.5">
                            {task.link && (
                              <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <span className={getStatusColor(task.status)}>{task.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {expanded[proj.id] && proj.tasks.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-3 text-center py-2">No tasks yet</p>
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
