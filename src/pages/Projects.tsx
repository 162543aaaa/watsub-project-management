import { useState, useRef } from "react";
import { Plus, ChevronDown, ChevronUp, ExternalLink, X, Save, Trash2, Pencil, GripVertical, Download, Sheet, FileText, FolderOpen } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

function exportCSV(rows: string[][], filename: string) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(title: string, html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>${title}</title>
  <style>
    body{font-family:sans-serif;font-size:13px;color:#1a1a1a;padding:32px;max-width:960px;margin:0 auto;}
    h1{font-size:20px;margin-bottom:2px;} .sub{color:#888;font-size:11px;margin-bottom:20px;}
    .section-title{font-size:14px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #eee;padding-bottom:5px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{background:#f0f0f0;text-align:left;padding:7px 10px;font-size:11px;font-weight:600;}
    td{padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:11px;}
    .badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:600;}
    .done{background:#d1fae5;color:#065f46;} .prog{background:#e0f2fe;color:#0369a1;} .todo{background:#f3f4f6;color:#6b7280;}
    .bar-wrap{background:#e5e7eb;border-radius:99px;height:6px;min-width:60px;}
    .bar{background:#0891b2;border-radius:99px;height:6px;}
  </style></head><body>
  ${html}
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

export default function Projects() {
  const { projects, loading, addProject, deleteProject, addTask, updateTask, deleteTask, reorderProjects } = useProjects();
  const { employees } = useEmployees();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", month: 1, note: "" });
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [taskModal, setTaskModal] = useState<{ projectId: string; task?: Task } | null>(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  const periodLabel = filterMonth === "all" ? `${filterYear}` : `${monthNames[filterMonth]} ${filterYear}`;

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const rows: string[][] = [
      ["Projects Export", periodLabel],
      [],
      ["Project Name", "Month", "Note", "Total Tasks", "Done", "In Progress", "To Do", "Progress %"],
    ];
    Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).forEach(([month, projs]) => {
      const orderedProjs = getOrdered(Number(month), projs);
      orderedProjs.forEach(proj => {
        const done = proj.tasks.filter(t => t.status === "Done").length;
        const inProg = proj.tasks.filter(t => t.status === "In Progress").length;
        const todo = proj.tasks.filter(t => t.status === "To Do").length;
        const pct = proj.tasks.length ? Math.round((done / proj.tasks.length) * 100) : 0;
        rows.push([proj.name, monthNames[Number(month)], proj.note || "", String(proj.tasks.length), String(done), String(inProg), String(todo), `${pct}%`]);
        if (proj.tasks.length > 0) {
          rows.push(["", "  Task Name", "Status", "Priority", "Assigned To", "Due Date", "", ""]);
          proj.tasks.forEach(t => rows.push(["", `  ${t.name}`, t.status, t.priority, (t.assigned_to || []).join("; "), t.due_date || "", "", ""]));
        }
      });
    });
    exportCSV(rows, `projects-${periodLabel.replace(/ /g, "-")}.csv`);
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    let html = `<h1>Projects – ${periodLabel}</h1><div class="sub">Generated ${new Date().toLocaleString("en")}</div>`;
    Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).forEach(([month, projs]) => {
      const orderedProjs = getOrdered(Number(month), projs);
      html += `<div class="section-title">${monthNames[Number(month)]} ${filterYear} (${projs.length} projects)</div>`;
      orderedProjs.forEach(proj => {
        const done = proj.tasks.filter(t => t.status === "Done").length;
        const pct = proj.tasks.length ? Math.round((done / proj.tasks.length) * 100) : 0;
        html += `<p style="font-weight:600;margin:10px 0 4px">${proj.name}${proj.note ? ` — <span style="font-weight:400;color:#888">${proj.note}</span>` : ""}</p>`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div class="bar-wrap" style="flex:1"><div class="bar" style="width:${pct}%"></div></div><span style="font-size:11px;font-weight:700">${pct}%</span><span style="font-size:10px;color:#888">${done}/${proj.tasks.length} done</span></div>`;
        if (proj.tasks.length > 0) {
          html += `<table><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Due</th></tr></thead><tbody>`;
          proj.tasks.forEach(t => {
            const cls = t.status === "Done" ? "done" : t.status === "In Progress" ? "prog" : "todo";
            html += `<tr><td>${t.name}</td><td><span class="badge ${cls}">${t.status}</span></td><td>${t.priority}</td><td>${(t.assigned_to || []).join(", ") || "-"}</td><td>${t.due_date || "-"}</td></tr>`;
          });
          html += `</tbody></table>`;
        }
      });
    });
    exportPDF(`Projects – ${periodLabel}`, html);
  };

  // Projects are already sorted by sort_order from DB; just return them as-is for display
  const getOrdered = (_monthNum: number, projs: typeof projects) => projs;

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} projects across {months.length} months</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-muted transition-all"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden animate-scale-in">
                <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left">
                  <Sheet className="w-4 h-4 text-green-600" /> Export CSV
                </button>
                <div className="h-px bg-border" />
                <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left">
                  <FileText className="w-4 h-4 text-red-500" /> Export PDF
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowAddProject(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-stagger-2">
        <div className="flex gap-1">
          {YEARS.map(y => (
            <button key={y} onClick={() => setFilterYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filterYear === y ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              {y}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
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
                  {employees.filter(e => !taskForm.assigned_to.includes(e.name)).map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
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
        {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([month, projs]) => {
          const monthNum = Number(month);
          const orderedProjs = getOrdered(monthNum, projs);
          const ids = orderedProjs.map(p => p.id);
          return (
            <div key={month} className="animate-stagger-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {monthNames[monthNum]?.slice(0, 3)}
                </div>
                <h2 className="text-lg font-bold text-foreground">{monthNames[monthNum]} {filterYear}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{projs.length} projects</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragEnd={async (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const cur = orderedProjs.map(p => p.id);
                  const newOrder = arrayMove(cur, cur.indexOf(active.id as string), cur.indexOf(over.id as string));
                  const reordered = newOrder.map(id => orderedProjs.find(p => p.id === id)!);
                  await reorderProjects(reordered);
                }}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {orderedProjs.map(proj => {
                      const donePct = proj.tasks.length ? Math.round(proj.tasks.filter(t => t.status === "Done").length / proj.tasks.length * 100) : 0;
                      const isExpanded = !!expanded[proj.id];
                      return <SortableProjCard key={proj.id} id={proj.id}>
                        <div className="bg-card rounded-2xl border border-border/60 p-5 card-hover group flex flex-col h-full">
                          <div className="flex items-start gap-2 mb-3">
                            <div className="w-1 rounded-full flex-shrink-0 mt-0.5 self-stretch min-h-[36px]"
                              style={{ background: donePct === 100 ? "hsl(142 71% 45%)" : donePct > 0 ? "hsl(191 91% 37%)" : "hsl(215 14% 75%)" }} />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground leading-tight">{proj.name}</h3>
                              {proj.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{proj.note}</p>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <button onClick={() => openAddTask(proj.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-all hover:scale-110 active:scale-95">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteProject(proj.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-all hover:scale-110 active:scale-95">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{proj.tasks.length} tasks</span>
                            {donePct === 100 && proj.tasks.length > 0 && <span className="badge-done text-xs">✓ Complete</span>}
                          </div>
                          {proj.tasks.length > 0 && <div className="mb-4"><ProgressBar tasks={proj.tasks} /></div>}
                          <div className="flex items-center gap-3 mt-auto pt-1">
                            <button onClick={() => setExpanded(prev => ({ ...prev, [proj.id]: !prev[proj.id] }))}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {isExpanded ? "Hide" : "Show"} tasks
                            </button>
                            <button onClick={() => openAddTask(proj.id)}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                              <Plus className="w-3.5 h-3.5" /> Add task
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                              {proj.tasks.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                                  <button onClick={() => openAddTask(proj.id)} className="text-xs text-primary font-semibold mt-1 hover:underline">Add first task →</button>
                                </div>
                              ) : proj.tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 hover:bg-muted/80 group/task transition-colors">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                                  <span className="text-xs font-medium text-foreground flex-1 truncate">{task.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                    {task.link && (
                                      <a href={task.link} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded flex items-center justify-center hover:bg-primary/10 transition-all">
                                        <ExternalLink className="w-3 h-3 text-primary" />
                                      </a>
                                    )}
                                    <button onClick={() => openEditTask(proj.id, task)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-primary/10 transition-all">
                                      <Pencil className="w-3 h-3 text-primary" />
                                    </button>
                                    <button onClick={() => deleteTask(task.id, proj.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-destructive/10 transition-all">
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </SortableProjCard>;
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-medium">No projects found</p>
            <button onClick={() => setShowAddProject(true)} className="mt-3 text-xs text-primary font-semibold hover:underline">
              Create your first project →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableProjCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="relative">
      <div {...attributes} {...listeners}
        className="absolute top-3 right-12 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors"
        style={{ touchAction: "none" }}>
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      {children}
    </div>
  );
}
