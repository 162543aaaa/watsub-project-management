import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, ExternalLink, X, Save, Trash2, Pencil } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { Task } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = [2025, 2026, 2027];

const emptyTask = { name: "", status: "To Do" as Task["status"], priority: "Medium" as Task["priority"], assigned_to: [] as string[], due_date: "", start_date: "", link: "", comments: "" };

function ProgressBar({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter(t => t.status === "Done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <span className="text-xs font-semibold text-primary w-8 text-right">{pct}%</span>
    </div>
  );
}

const getStatusBadge = (status: string) => {
  if (status === "Done") return "badge-done";
  if (status === "In Progress") return "badge-progress";
  return "badge-todo";
};

export default function Projects() {
  const { projects, loading, addProject, deleteProject, addTask, updateTask, deleteTask } = useProjects();
  const { employees } = useEmployees();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", month: 1, note: "" });
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [taskModal, setTaskModal] = useState<{ projectId: string; task?: Task } | null>(null);
  const [taskForm, setTaskForm] = useState(emptyTask);

  const months = [...new Set(projects.map(p => p.month))].sort();
  const filtered = filterMonth === "all" ? projects : projects.filter(p => p.month === filterMonth);
  const grouped: Record<number, typeof projects> = {};
  filtered.forEach(p => { if (!grouped[p.month]) grouped[p.month] = []; grouped[p.month].push(p); });

  const handleAddProject = async () => {
    if (!newProject.name.trim()) { toast({ title: "กรุณากรอกชื่อโปรเจกต์", variant: "destructive" }); return; }
    await addProject(newProject);
    setNewProject({ name: "", month: 1, note: "" });
    setShowAddProject(false);
  };

  const openAddTask = (projectId: string) => {
    setTaskForm(emptyTask);
    setTaskModal({ projectId });
  };

  const openEditTask = (projectId: string, task: Task) => {
    setTaskForm({ name: task.name, status: task.status, priority: task.priority, assigned_to: task.assigned_to || [], due_date: task.due_date || "", start_date: task.start_date || "", link: task.link || "", comments: task.comments || "" });
    setTaskModal({ projectId, task });
  };

  const handleSaveTask = async () => {
    if (!taskModal || !taskForm.name.trim()) { toast({ title: "กรุณากรอกชื่องาน", variant: "destructive" }); return; }
    if (taskModal.task) {
      await updateTask(taskModal.task.id, taskForm);
    } else {
      await addTask({ ...taskForm, task_type: "project", project_id: taskModal.projectId });
    }
    setTaskModal(null);
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} projects across {months.length} months</p>
        </div>
        <button onClick={() => setShowAddProject(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-stagger-2">
        {/* Year filter */}
        <div className="flex gap-1">
          {YEARS.map(y => (
            <button key={y} onClick={() => setFilterYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filterYear === y ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              {y}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        {/* Month filter */}
        <div className="flex flex-wrap gap-1.5">
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
      </div>

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">New Project</h3>
              <button onClick={() => setShowAddProject(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Project Name</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="Project name..." autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Month</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={newProject.month} onChange={e => setNewProject({ ...newProject, month: Number(e.target.value) })}>
                  {monthNames.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Note</label>
                <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none resize-none"
                  value={newProject.note} onChange={e => setNewProject({ ...newProject, note: e.target.value })} placeholder="Optional note..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddProject(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleAddProject} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg animate-scale-in overflow-y-auto max-h-[90vh]" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{taskModal.task ? "Edit Task" : "Add Task"}</h3>
              <button onClick={() => setTaskModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Task Name</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })} placeholder="Task name..." autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Status</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as Task["status"] })}>
                    <option>To Do</option><option>In Progress</option><option>Done</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Priority</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as Task["priority"] })}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Assigned To</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  onChange={e => { const v = e.target.value; if (v && !taskForm.assigned_to.includes(v)) setTaskForm({ ...taskForm, assigned_to: [...taskForm.assigned_to, v] }); }}>
                  <option value="">Select...</option>
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {taskForm.assigned_to.map(a => (
                    <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                      {a.split(" ")[0]}
                      <button onClick={() => setTaskForm({ ...taskForm, assigned_to: taskForm.assigned_to.filter(x => x !== a) })}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Start Date</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={taskForm.start_date} onChange={e => setTaskForm({ ...taskForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Due Date</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Link</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={taskForm.link} onChange={e => setTaskForm({ ...taskForm, link: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Note</label>
                <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none resize-none"
                  value={taskForm.comments} onChange={e => setTaskForm({ ...taskForm, comments: e.target.value })} placeholder="Optional note..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setTaskModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleSaveTask} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {taskModal.task ? "Save" : "Add Task"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Projects by month */}
      <div className="space-y-8">
        {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([month, projs]) => (
          <div key={month} className="animate-stagger-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                {monthNames[Number(month)]?.slice(0, 3)}
              </div>
              <h2 className="text-lg font-bold text-foreground">{monthNames[Number(month)]} {filterYear}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{projs.length} projects</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projs.map(proj => (
                <div key={proj.id} className="bg-card rounded-2xl border border-border/60 p-5 card-hover group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground">{proj.name}</h3>
                      {proj.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{proj.note}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openAddTask(proj.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-colors" title="Add task">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteProject(proj.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors" title="Delete project">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0 ml-1">{proj.tasks.length} tasks</span>
                  </div>
                  {proj.tasks.length > 0 && (
                    <div className="mb-3">
                      <ProgressBar tasks={proj.tasks} />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => setExpanded(prev => ({ ...prev, [proj.id]: !prev[proj.id] }))}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {expanded[proj.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {expanded[proj.id] ? "Hide" : "Show"} tasks
                    </button>
                    <button onClick={() => openAddTask(proj.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add task
                    </button>
                  </div>
                  {expanded[proj.id] && (
                    <div className="mt-3 space-y-2">
                      {proj.tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No tasks yet</p>
                      ) : proj.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 group/task">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                          <span className="text-xs font-medium text-foreground flex-1 truncate">{task.name}</span>
                          <div className="flex items-center gap-1.5">
                            {task.link && (
                              <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <span className={getStatusBadge(task.status)}>{task.status}</span>
                            <button
                              onClick={() => openEditTask(proj.id, task)}
                              className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/task:opacity-100 hover:bg-primary/10 transition-all"
                            >
                              <Pencil className="w-3 h-3 text-primary" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id, proj.id)}
                              className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/task:opacity-100 hover:bg-destructive/10 transition-all"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
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
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No projects found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// needed for empty state icon
import { FolderOpen } from "lucide-react";
