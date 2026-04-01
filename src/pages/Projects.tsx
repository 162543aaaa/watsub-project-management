import { useState, useRef } from "react";
import { Plus, ChevronDown, ChevronUp, ExternalLink, X, Save, Trash2, Pencil, GripVertical, Download, Sheet, FileText, FolderOpen, Clock, AlertTriangle } from "lucide-react";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjects } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { Task, Pillar } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";
import { exportCSV, exportPDF, escapeHtml } from "@/lib/exportUtils";
import EditTaskModal from "@/components/EditTaskModal";
import EditProjectModal from "@/components/EditProjectModal";

const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = [2025, 2026, 2027];

const PILLAR_CONFIG: Record<Pillar, { label: string; color: string; textColor: string }> = {
  VIBES: { label: "#VIBES", color: "#C8FF00", textColor: "#3D4D00" },
  SOUL: { label: "#SOUL", color: "#7B4FCC", textColor: "#FFFFFF" },
  JOINT: { label: "#JOINT", color: "#FF6B35", textColor: "#FFFFFF" },
};
const PILLARS: Pillar[] = ["VIBES", "SOUL", "JOINT"];

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

function DaysBadge({ startDate, dueDate, status }: { startDate?: string; dueDate?: string; status: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const badges: React.ReactNode[] = [];

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0) {
      badges.push(
        <span key="start" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: "hsl(191 91% 37% / 0.1)", color: "hsl(191 91% 30%)" }}>
          <Clock className="w-2.5 h-2.5" /> {diff} วัน
        </span>
      );
    }
  }

  if (dueDate && status !== "Done") {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) {
      badges.push(
        <span key="overdue" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold animate-pulse" style={{ background: "hsl(0 84% 60% / 0.1)", color: "hsl(0 84% 50%)" }}>
          <AlertTriangle className="w-2.5 h-2.5" /> เลย {diff} วัน
        </span>
      );
    }
  }

  return badges.length > 0 ? <div className="flex items-center gap-1 flex-wrap">{badges}</div> : null;
}


export default function Projects() {
  const { projects, loading, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, reorderProjects } = useProjects();
  const { employees } = useEmployees();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", month: 1, note: "", link: "", pillar: "SOUL" as Pillar });
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [filterPillar, setFilterPillar] = useState<Pillar | "all">("all");
  const [taskModal, setTaskModal] = useState<{ projectId: string; task?: Task } | null>(null);
  const [editModal, setEditModal] = useState<{ id: string; name: string; month: number; note: string; link: string; pillar: Pillar } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const months = [...new Set(projects.map(p => p.month))].sort();
  const afterPillar = filterPillar === "all" ? projects : projects.filter(p => p.pillar === filterPillar);
  const filtered = filterMonth === "all" ? afterPillar : afterPillar.filter(p => p.month === filterMonth);
  const grouped: Record<number, typeof projects> = {};
  filtered.forEach(p => { if (!grouped[p.month]) grouped[p.month] = []; grouped[p.month].push(p); });

  const handleAddProject = async () => {
    if (!newProject.name.trim()) { toast({ title: "กรุณากรอกชื่อโปรเจกต์", variant: "destructive" }); return; }
    await addProject({ name: newProject.name, month: newProject.month, note: newProject.note, link: newProject.link, pillar: newProject.pillar });
    setNewProject({ name: "", month: 1, note: "", link: "", pillar: "SOUL" });
    setShowAddProject(false);
  };

  const openEditProject = (proj: typeof projects[0]) => {
    setEditModal({ id: proj.id, name: proj.name, month: proj.month, note: proj.note || "", link: proj.link || "", pillar: proj.pillar });
  };

  const handleEditProject = async (formData: { name: string; month: number; pillar: Pillar; link: string; note: string }) => {
    if (!editModal) return;
    await updateProject(editModal.id, formData);
    setEditModal(null);
  };

  const openAddTask = (projectId: string) => {
    setTaskModal({ projectId });
  };

  const openEditTask = (projectId: string, task: Task) => {
    setTaskModal({ projectId, task });
  };

  const handleSaveTask = async (formData: Partial<Task>) => {
    if (!taskModal) return;
    if (taskModal.task) {
      await updateTask(taskModal.task.id, formData);
    } else {
      await addTask({ ...formData, task_type: "project", project_id: taskModal.projectId });
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
      projs.forEach(proj => {
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
    let html = `<h1>Projects – ${escapeHtml(periodLabel)}</h1><div class="sub">Generated ${escapeHtml(new Date().toLocaleString("en"))}</div>`;
    Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).forEach(([month, projs]) => {
      html += `<div class="section-title">${escapeHtml(monthNames[Number(month)])} ${filterYear} (${projs.length} projects)</div>`;
      projs.forEach(proj => {
        const done = proj.tasks.filter(t => t.status === "Done").length;
        const pct = proj.tasks.length ? Math.round((done / proj.tasks.length) * 100) : 0;
        html += `<p style="font-weight:600;margin:10px 0 4px">${escapeHtml(proj.name)}${proj.note ? ` — <span style="font-weight:400;color:#888">${escapeHtml(proj.note)}</span>` : ""}</p>`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div class="bar-wrap" style="flex:1"><div class="bar" style="width:${pct}%"></div></div><span style="font-size:11px;font-weight:700">${pct}%</span><span style="font-size:10px;color:#888">${done}/${proj.tasks.length} done</span></div>`;
        if (proj.tasks.length > 0) {
          html += `<table><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Due</th></tr></thead><tbody>`;
          proj.tasks.forEach(t => {
            const cls = t.status === "Done" ? "done" : t.status === "In Progress" ? "prog" : "todo";
            html += `<tr><td>${escapeHtml(t.name)}</td><td><span class="badge ${cls}">${escapeHtml(t.status)}</span></td><td>${escapeHtml(t.priority)}</td><td>${escapeHtml((t.assigned_to || []).join(", ") || "-")}</td><td>${escapeHtml(t.due_date || "-")}</td></tr>`;
          });
          html += `</tbody></table>`;
        }
      });
    });
    exportPDF(`Projects – ${periodLabel}`, html);
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} projects across {months.length} months</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-muted transition-all hover:scale-105 active:scale-95"
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
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${filterYear === y ? "bg-foreground text-background scale-105" : "bg-muted text-muted-foreground hover:bg-secondary hover:scale-105"}`}>
              {y}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterMonth("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${filterMonth === "all" ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground hover:bg-secondary hover:scale-105"}`}>
            All
          </button>
          {months.map(m => (
            <button key={m} onClick={() => setFilterMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${filterMonth === m ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground hover:bg-secondary hover:scale-105"}`}>
              {monthNames[m]}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterPillar("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${filterPillar === "all" ? "bg-foreground text-background scale-105" : "bg-muted text-muted-foreground hover:bg-secondary hover:scale-105"}`}>
            All
          </button>
          {PILLARS.map(p => (
            <button key={p} onClick={() => setFilterPillar(p)}
              className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105"
              style={{
                background: filterPillar === p ? PILLAR_CONFIG[p].color : `${PILLAR_CONFIG[p].color}22`,
                color: filterPillar === p ? PILLAR_CONFIG[p].textColor : PILLAR_CONFIG[p].color,
                border: filterPillar === p ? "none" : `1px solid ${PILLAR_CONFIG[p].color}44`,
                transform: filterPillar === p ? "scale(1.05)" : undefined,
              }}>
              {PILLAR_CONFIG[p].label}
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
              <button onClick={() => setShowAddProject(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-all hover:scale-110"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Project Name</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Pillar <span className="text-destructive">*</span></label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={newProject.pillar} onChange={e => setNewProject({ ...newProject, pillar: e.target.value as Pillar })}>
                  {PILLARS.map(p => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Link</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none transition-all"
                  value={newProject.link} onChange={e => setNewProject({ ...newProject, link: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Note</label>
                <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none resize-none"
                  value={newProject.note} onChange={e => setNewProject({ ...newProject, note: e.target.value })} placeholder="Optional note..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddProject(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all hover:scale-[1.02] active:scale-[0.98]">Cancel</button>
              <button onClick={handleAddProject} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Create</button>
            </div>
          </div>
        </div>
      )}

      <EditProjectModal
        isOpen={!!editModal}
        project={editModal}
        onClose={() => setEditModal(null)}
        onSave={handleEditProject}
      />

      <EditTaskModal
        isOpen={!!taskModal}
        task={taskModal?.task ?? null}
        employees={employees}
        onClose={() => setTaskModal(null)}
        onSave={handleSaveTask}
      />

      {/* Projects by month */}
      <div className="space-y-8">
        {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([month, projs]) => {
          const monthNum = Number(month);
          const ids = projs.map(p => p.id);
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
                  const cur = projs.map(p => p.id);
                  const newOrder = arrayMove(cur, cur.indexOf(active.id as string), cur.indexOf(over.id as string));
                  const reordered = newOrder.map(id => projs.find(p => p.id === id)!);
                  await reorderProjects(reordered);
                }}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {projs.map(proj => {
                      const donePct = proj.tasks.length ? Math.round(proj.tasks.filter(t => t.status === "Done").length / proj.tasks.length * 100) : 0;
                      const isExpanded = !!expanded[proj.id];
                      return <SortableProjCard key={proj.id} id={proj.id}>
                        <div className="bg-card rounded-2xl border border-border/60 p-5 card-hover group flex flex-col h-full cursor-pointer" onDoubleClick={() => openEditProject(proj)}>
                          <div className="flex items-start gap-2 mb-3">
                            <div className="w-1 rounded-full flex-shrink-0 mt-0.5 self-stretch min-h-[36px]"
                              style={{ background: donePct === 100 ? "hsl(142 71% 45%)" : donePct > 0 ? "hsl(191 91% 37%)" : "hsl(215 14% 75%)" }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-foreground leading-tight">{proj.name}</h3>
                                {proj.link && (
                                  <a href={proj.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                    className="text-primary hover:text-primary/80 transition-all hover:scale-110 flex-shrink-0"
                                    title={proj.link}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              {proj.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{proj.note}</p>}
                              <span
                                className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold leading-tight w-fit"
                                style={{ background: PILLAR_CONFIG[proj.pillar]?.color || "#888", color: PILLAR_CONFIG[proj.pillar]?.textColor || "#fff" }}>
                                {PILLAR_CONFIG[proj.pillar]?.label || `#${proj.pillar}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <button onClick={(e) => { e.stopPropagation(); openEditProject(proj); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-all hover:scale-110 active:scale-95">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openAddTask(proj.id); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-all hover:scale-110 active:scale-95">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteProject(proj.id); }}
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
                            <button onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [proj.id]: !prev[proj.id] })); }}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all hover:scale-105">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {isExpanded ? "Hide" : "Show"} tasks
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openAddTask(proj.id); }}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold transition-all hover:scale-105">
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
                                <div key={task.id} className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/50 hover:bg-muted/80 group/task transition-all cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); openEditTask(proj.id, task); }}>
                                   <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                                     <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-medium text-foreground truncate">{task.name}</span>
                                          {task.category && task.category !== "none" && (
                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${task.category === "meeting" ? "bg-violet-100 text-violet-700" : "bg-rose-100 text-rose-700"}`}>
                                              {task.category === "meeting" ? "🗓" : "📍"}
                                            </span>
                                          )}
                                        </div>
                                        <DaysBadge startDate={task.start_date} dueDate={task.due_date} status={task.status} />
                                     </div>
                                     {task.assigned_to && task.assigned_to.length > 0 && (
                                       <div className="flex -space-x-1.5 flex-shrink-0">
                                         {task.assigned_to.slice(0, 3).map((name, idx) => {
                                           const emp = employees.find(e => e.name === name);
                                           return <EmployeeAvatar key={name} name={name} avatar={emp?.avatar} size="xs" index={employees.indexOf(emp!)} />;
                                         })}
                                         {task.assigned_to.length > 3 && (
                                           <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0 border border-background">
                                             +{task.assigned_to.length - 3}
                                           </div>
                                         )}
                                       </div>
                                     )}
                                     <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                        {task.link && (
                                          <a href={task.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-5 h-5 rounded flex items-center justify-center hover:bg-primary/10 transition-all hover:scale-110">
                                            <ExternalLink className="w-3 h-3 text-primary" />
                                          </a>
                                        )}
                                     <button onClick={(e) => { e.stopPropagation(); openEditTask(proj.id, task); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-primary/10 transition-all hover:scale-110">
                                       <Pencil className="w-3 h-3 text-primary" />
                                     </button>
                                     <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id, proj.id); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-destructive/10 transition-all hover:scale-110">
                                       <Trash2 className="w-3 h-3 text-destructive" />
                                    </button>
                                     </div>
                                   </div>
                                   {task.link && (
                                     <a href={task.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                        className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary pl-4 truncate transition-colors">
                                       <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                       <span className="truncate">{task.link.replace(/^https?:\/\//, "")}</span>
                                     </a>
                                   )}
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
