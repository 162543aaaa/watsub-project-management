import { CheckIcon, ClockIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/hooks/use-toast";
import { Pillar } from "@/hooks/useProjects";
import ProjectActivityLog from "@/components/ProjectActivityLog";

const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PILLARS: Pillar[] = ["VIBES", "SOUL", "JOINT"];
const YEARS = [2025, 2026, 2027];

export interface ProjectFormData {
  name: string;
  month: number;
  year: number;
  pillar: Pillar;
  link: string;
  note: string;
  start_date?: string;
  deadline?: string;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: (ProjectFormData & { id: string }) | null;
  onSave: (data: ProjectFormData) => void;
}

type Tab = "details" | "activity";

export default function EditProjectModal({ isOpen, onClose, project, onSave }: EditProjectModalProps) {
  const defaultForm: ProjectFormData = {
    name: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    pillar: "JOINT",
    link: "",
    note: "",
    start_date: "",
    deadline: "",
  };
  const [form, setForm] = useState<ProjectFormData>(project ?? defaultForm);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [prevProject, setPrevProject] = useState(project);

  if (project !== prevProject) {
    setPrevProject(project);
    setForm(project ?? defaultForm);
    setActiveTab("details");
  }

  if (!isOpen || !project) return null;

  const save = () => {
    if (!form.name.trim()) {
      toast({ title: "กรุณากรอกชื่อโปรเจกต์", variant: "destructive" });
      return;
    }
    if (form.start_date && form.deadline && form.deadline < form.start_date) {
      toast({ title: "Deadline ต้องไม่มาก่อน Start date", variant: "destructive" });
      return;
    }
    onSave(form);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="text-lg font-bold">Edit Project</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted" aria-label="Close">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          <button onClick={() => setActiveTab("details")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${activeTab === "details" ? "bg-info/10 text-info" : "text-muted-foreground"}`}>
            <PencilIcon className="h-3.5 w-3.5" /> Details
          </button>
          <button onClick={() => setActiveTab("activity")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${activeTab === "activity" ? "bg-info/10 text-info" : "text-muted-foreground"}`}>
            <ClockIcon className="h-3.5 w-3.5" /> Activity
          </button>
          <div className="mb-0 self-end flex-1 border-b border-border" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "activity" ? (
            <ProjectActivityLog projectId={project.id} />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project Name</label>
                <input className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Year</label>
                  <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}>
                    {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Month</label>
                  <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>
                    {monthNames.slice(1).map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pillar</label>
                <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value as Pillar })}>
                  {PILLARS.map((pillar) => <option key={pillar} value={pillar}>#{pillar}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</label>
                  <input type="date" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deadline</label>
                  <input type="date" min={form.start_date || undefined} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={form.deadline ?? ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link</label>
                <input className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note</label>
                <textarea rows={3} className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-border p-6 pt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
          {activeTab === "details" && (
            <button onClick={save} className="btn-primary flex flex-1 items-center justify-center gap-2">
              <CheckIcon className="h-4 w-4" /> Save
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
