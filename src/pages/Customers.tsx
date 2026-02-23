import { useState, useRef } from "react";
import { Plus, ChevronDown, ChevronUp, ExternalLink, X, Save, DollarSign, Trash2, Pencil, Users2, GripVertical, Download, Sheet, FileText, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCustomers } from "@/hooks/useCustomers";
import { Task } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "@/hooks/use-toast";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = [2025, 2026, 2027];

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

const emptyTask = { name: "", status: "To Do" as Task["status"], priority: "Medium" as Task["priority"], assigned_to: [] as string[], due_date: "", start_date: "", link: "", comments: "", category: "none" };

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
    .fee{background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;}
    .bar-wrap{background:#e5e7eb;border-radius:99px;height:6px;min-width:60px;}
    .bar{background:#059669;border-radius:99px;height:6px;}
  </style></head><body>
  ${html}
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

export default function Customers() {
  const { customers, loading, addCustomer, deleteCustomer, addTask, updateTask, deleteTask, reorderCustomers, updateCustomer } = useCustomers();
  const { employees } = useEmployees();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", detail: "", payment_fee: "", project_title: "", note: "", link: "", month: 1 });
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [taskModal, setTaskModal] = useState<{ customerId: string; task?: Task } | null>(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [editModal, setEditModal] = useState<{ id: string; name: string; detail: string; payment_fee: string; project_title: string; note: string; link: string; month: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Filter by year AND month
  const filtered = customers.filter(c => {
    // Year filter: use month to determine year context — customers with month field belong to filterYear
    // Since customers don't have a year field, we show all for selected year
    // Month filter
    if (filterMonth !== "all" && c.month !== filterMonth) return false;
    return true;
  });
  
  const months = [...new Set(customers.map(c => c.month))].sort();
  const grouped: Record<number, typeof customers> = {};
  filtered.forEach(c => { if (!grouped[c.month]) grouped[c.month] = []; grouped[c.month].push(c); });

  const handleAddCustomer = async () => {
    if (!form.name.trim()) { toast({ title: "กรุณากรอกชื่อลูกค้า", variant: "destructive" }); return; }
    await addCustomer({ name: form.name, detail: form.detail, payment_fee: form.payment_fee, project_title: form.project_title, note: form.note, link: form.link, month: form.month });
    setForm({ name: "", detail: "", payment_fee: "", project_title: "", note: "", link: "", month: 1 });
    setShowAdd(false);
  };

  const openEditCustomer = (cust: typeof customers[0]) => {
    setEditModal({ id: cust.id, name: cust.name, detail: cust.detail || "", payment_fee: cust.payment_fee || "", project_title: cust.project_title || "", note: cust.note || "", link: (cust as any).link || "", month: cust.month });
  };

  const handleEditCustomer = async () => {
    if (!editModal || !editModal.name.trim()) { toast({ title: "กรุณากรอกชื่อลูกค้า", variant: "destructive" }); return; }
    await updateCustomer(editModal.id, { name: editModal.name, detail: editModal.detail, payment_fee: editModal.payment_fee, project_title: editModal.project_title, note: editModal.note, link: editModal.link, month: editModal.month });
    setEditModal(null);
  };

  const openAddTask = (customerId: string) => {
    setTaskForm(emptyTask);
    setTaskModal({ customerId });
  };

  const openEditTask = (customerId: string, task: Task) => {
    setTaskForm({ name: task.name, status: task.status, priority: task.priority, assigned_to: task.assigned_to || [], due_date: task.due_date || "", start_date: task.start_date || "", link: task.link || "", comments: task.comments || "", category: task.category || "none" });
    setTaskModal({ customerId, task });
  };

  const handleSaveTask = async () => {
    if (!taskModal || !taskForm.name.trim()) { toast({ title: "กรุณากรอกชื่องาน", variant: "destructive" }); return; }
    if (taskModal.task) {
      await updateTask(taskModal.task.id, taskForm);
    } else {
      await addTask({ ...taskForm, task_type: "customer", customer_id: taskModal.customerId });
    }
    setTaskModal(null);
  };

  const getOrdered = (_monthNum: number, custs: typeof customers) => custs;

  const periodLabel = filterMonth === "all" ? `${filterYear}` : `${monthNames[filterMonth]} ${filterYear}`;

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const rows: string[][] = [
      ["Customers Export", periodLabel],
      [],
      ["Customer Name", "Project Title", "Payment Fee", "Detail", "Note", "Month", "Total Tasks", "Done", "In Progress", "To Do", "Progress %"],
    ];
    Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).forEach(([month, custs]) => {
      const orderedCusts = getOrdered(Number(month), custs);
      orderedCusts.forEach(cust => {
        const done = cust.tasks.filter(t => t.status === "Done").length;
        const inProg = cust.tasks.filter(t => t.status === "In Progress").length;
        const todo = cust.tasks.filter(t => t.status === "To Do").length;
        const pct = cust.tasks.length ? Math.round((done / cust.tasks.length) * 100) : 0;
        rows.push([cust.name, cust.project_title || "", cust.payment_fee || "", cust.detail || "", cust.note || "", monthNames[Number(month)], String(cust.tasks.length), String(done), String(inProg), String(todo), `${pct}%`]);
        if (cust.tasks.length > 0) {
          rows.push(["", "  Task Name", "Status", "Priority", "Assigned To", "Due Date", "", "", "", "", ""]);
          cust.tasks.forEach(t => rows.push(["", `  ${t.name}`, t.status, t.priority, (t.assigned_to || []).join("; "), t.due_date || "", "", "", "", "", ""]));
        }
      });
    });
    exportCSV(rows, `customers-${periodLabel.replace(/ /g, "-")}.csv`);
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    let html = `<h1>Customers – ${periodLabel}</h1><div class="sub">Generated ${new Date().toLocaleString("en")}</div>`;
    Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).forEach(([month, custs]) => {
      const orderedCusts = getOrdered(Number(month), custs);
      html += `<div class="section-title">${monthNames[Number(month)]} ${filterYear} (${custs.length} customers)</div>`;
      html += `<table><thead><tr><th>Customer</th><th>Project</th><th>Fee</th><th>Tasks</th><th>Done</th><th>Progress</th></tr></thead><tbody>`;
      orderedCusts.forEach(cust => {
        const done = cust.tasks.filter(t => t.status === "Done").length;
        const pct = cust.tasks.length ? Math.round((done / cust.tasks.length) * 100) : 0;
        html += `<tr>
          <td><strong>${cust.name}</strong>${cust.detail ? `<br><span style="color:#888;font-size:10px">${cust.detail}</span>` : ""}</td>
          <td>${cust.project_title || "-"}</td>
          <td>${cust.payment_fee ? `<span class="fee">${cust.payment_fee}</span>` : "-"}</td>
          <td>${cust.tasks.length}</td>
          <td>${done}</td>
          <td><div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div><span style="font-size:10px;font-weight:700"> ${pct}%</span></td>
        </tr>`;
        if (cust.tasks.length > 0) {
          html += `<tr><td colspan="6" style="padding:0 10px 8px;"><table style="margin:0"><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Due</th></tr></thead><tbody>`;
          cust.tasks.forEach(t => {
            const cls = t.status === "Done" ? "done" : t.status === "In Progress" ? "prog" : "todo";
            html += `<tr><td>${t.name}</td><td><span class="badge ${cls}">${t.status}</span></td><td>${t.priority}</td><td>${(t.assigned_to || []).join(", ") || "-"}</td><td>${t.due_date || "-"}</td></tr>`;
          });
          html += `</tbody></table></td></tr>`;
        }
      });
      html += `</tbody></table>`;
    });
    exportPDF(`Customers – ${periodLabel}`, html);
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} clients managed</p>
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
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Customer
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
      </div>

      {/* Add Customer Modal */}
      {showAdd && (
        <CustomerModal
          title="New Customer"
          form={form}
          setForm={setForm as any}
          onSave={handleAddCustomer}
          onClose={() => setShowAdd(false)}
          monthNames={monthNames}
        />
      )}

      {/* Edit Customer Modal */}
      {editModal && (
        <CustomerModal
          title="Edit Customer"
          form={editModal}
          setForm={(f: any) => setEditModal({ ...editModal, ...f })}
          onSave={handleEditCustomer}
          onClose={() => setEditModal(null)}
          monthNames={monthNames}
        />
      )}

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          task={taskModal.task}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          employees={employees}
          onSave={handleSaveTask}
          onClose={() => setTaskModal(null)}
        />
      )}

      {/* Customer Cards */}
      <div className="space-y-8">
        {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([month, custs]) => {
          const monthNum = Number(month);
          const orderedCusts = getOrdered(monthNum, custs);
          const ids = orderedCusts.map(c => c.id);
          return (
            <div key={month} className="animate-stagger-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-success flex items-center justify-center text-white text-xs font-bold">
                  {monthNames[monthNum]?.slice(0, 3)}
                </div>
                <h2 className="text-lg font-bold text-foreground">{monthNames[monthNum]} {filterYear}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{custs.length} customers</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragEnd={async (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const cur = orderedCusts.map(c => c.id);
                  const newOrder = arrayMove(cur, cur.indexOf(active.id as string), cur.indexOf(over.id as string));
                  const reordered = newOrder.map(id => orderedCusts.find(c => c.id === id)!);
                  await reorderCustomers(reordered);
                }}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {orderedCusts.map(cust => (
                      <SortableCustCard key={cust.id} id={cust.id}>
                        <div className="bg-card rounded-2xl border border-border/60 p-5 card-hover group h-full">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-foreground">{cust.name}</h3>
                                {(cust as any).link && (
                                  <a href={(cust as any).link} target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 transition-all hover:scale-110 flex-shrink-0"
                                    title={(cust as any).link}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {cust.payment_fee && (
                                  <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 35%)" }}>
                                    <DollarSign className="w-2.5 h-2.5" />{cust.payment_fee}
                                  </span>
                                )}
                              </div>
                              {cust.project_title && <p className="text-xs text-muted-foreground mt-0.5">{cust.project_title}</p>}
                              {cust.detail && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cust.detail}</p>}
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditCustomer(cust)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-all hover:scale-110 active:scale-95">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openAddTask(cust.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-all hover:scale-110 active:scale-95">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteCustomer(cust.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-all hover:scale-110 active:scale-95">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{cust.tasks.length} tasks</span>
                              {cust.tasks.length > 0 && cust.tasks.every(t => t.status === "Done") && (
                                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 35%)" }}>
                                  <CheckCircle2 className="w-3 h-3" /> Complete
                                </span>
                              )}
                            </div>
                          </div>
                          {cust.tasks.length > 0 && <ProgressBar tasks={cust.tasks} />}
                          <div className="flex items-center gap-3 mt-3">
                            <button onClick={() => setExpanded(prev => ({ ...prev, [cust.id]: !prev[cust.id] }))}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all hover:scale-105">
                              {expanded[cust.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {expanded[cust.id] ? "Hide" : "Show"} tasks
                            </button>
                            <button onClick={() => openAddTask(cust.id)}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-all hover:scale-105">
                              <Plus className="w-3.5 h-3.5" /> Add task
                            </button>
                          </div>
                          {expanded[cust.id] && (
                            <div className="mt-3 space-y-2">
                              {cust.tasks.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-3">No tasks yet</p>
                              ) : cust.tasks.map(task => (
                                <div key={task.id} className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/50 hover:bg-muted/80 group/task transition-all">
                                   <div className="flex items-center gap-3">
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
                                     <div className="flex items-center gap-1.5 flex-shrink-0">
                                       {task.link && (
                                         <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 hover:scale-110 transition-all">
                                           <ExternalLink className="w-3 h-3" />
                                         </a>
                                       )}
                                       <span className={task.status === "Done" ? "badge-done" : task.status === "In Progress" ? "badge-progress" : "badge-todo"}>
                                         {task.status}
                                       </span>
                                       <button onClick={() => openEditTask(cust.id, task)}
                                         className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/task:opacity-100 hover:bg-primary/10 transition-all hover:scale-110">
                                         <Pencil className="w-3 h-3 text-primary" />
                                       </button>
                                       <button onClick={() => deleteTask(task.id, cust.id)}
                                         className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/task:opacity-100 hover:bg-destructive/10 transition-all hover:scale-110">
                                         <Trash2 className="w-3 h-3 text-destructive" />
                                       </button>
                                     </div>
                                   </div>
                                   {task.link && (
                                     <a href={task.link} target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary pl-5 truncate transition-colors">
                                       <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                       <span className="truncate">{task.link.replace(/^https?:\/\//, "")}</span>
                                     </a>
                                   )}
                                 </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </SortableCustCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCustCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="relative">
      <div {...attributes} {...listeners}
        className="absolute top-3 right-24 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors"
        style={{ touchAction: "none" }}>
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      {children}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CustomerModal({ title, form, setForm, onSave, onClose, monthNames }: {
  title: string;
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  onClose: () => void;
  monthNames: string[];
}) {
  const fields = [
    { label: "Customer Name", key: "name", placeholder: "Customer name..." },
    { label: "Project Title", key: "project_title", placeholder: "Project title..." },
    { label: "Payment Fee", key: "payment_fee", placeholder: "e.g. 25000" },
    { label: "Detail", key: "detail", placeholder: "Project details..." },
    { label: "Link", key: "link", placeholder: "https://..." },
    { label: "Note", key: "note", placeholder: "Notes..." },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in overflow-y-auto max-h-[90vh]" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-all hover:scale-110"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{f.label}</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                value={form[f.key] || ""}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
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
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all hover:scale-[1.02] active:scale-[0.98]">Cancel</button>
          <button onClick={onSave} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, taskForm, setTaskForm, employees, onSave, onClose }: {
  task?: Task;
  taskForm: any;
  setTaskForm: (f: any) => void;
  employees: { name: string; avatar?: string }[];
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription className="sr-only">กรอกข้อมูลงาน</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Task Name</label>
            <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })} placeholder="Task name..." autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Status</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                <option>To Do</option><option>In Progress</option><option>Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Priority</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Category</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={taskForm.category || "none"} onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}>
                <option value="none">— ไม่ระบุ —</option>
                <option value="meeting">🗓 Meetings</option>
                <option value="onsite">📍 On-site Work</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Assigned To</label>
            <MultiSelectAssignee
              selected={taskForm.assigned_to}
              onChange={val => setTaskForm({ ...taskForm, assigned_to: val })}
              employees={employees}
            />
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
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all">Cancel</button>
          <button onClick={onSave} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {task ? "Save" : "Add Task"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
