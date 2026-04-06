import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Pillar } from "@/hooks/useProjects";

const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PILLAR_CONFIG: Record<Pillar, { label: string }> = {
  VIBES: { label: "#VIBES" },
  SOUL: { label: "#SOUL" },
  JOINT: { label: "#JOINT" },
};
const PILLARS: Pillar[] = ["VIBES", "SOUL", "JOINT"];

const YEARS = [2025, 2026, 2027];

interface ProjectFormData {
  name: string;
  month: number;
  year: number;
  pillar: Pillar;
  link: string;
  note: string;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: (ProjectFormData & { id: string }) | null;
  onSave: (data: ProjectFormData) => void;
}

export default function EditProjectModal({ isOpen, onClose, project, onSave }: EditProjectModalProps) {
  const [form, setForm] = useState<ProjectFormData>(
    project ?? { name: "", month: new Date().getMonth() + 1, pillar: "JOINT", link: "", note: "" }
  );

  const [prevProject, setPrevProject] = useState(project);
  if (project !== prevProject) {
    setPrevProject(project);
    setForm(project ?? { name: "", month: new Date().getMonth() + 1, pillar: "JOINT", link: "", note: "" });
  }

  if (!isOpen) return null;

  const save = () => {
    if (!form.name?.trim()) {
      toast({ title: "กรุณากรอกชื่อโปรเจกต์", variant: "destructive" });
      return;
    }
    onSave(form);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-2xl bg-card rounded-2xl border border-border flex flex-col animate-scale-in"
        style={{ maxHeight: "90vh", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-5 shrink-0">
          <h3 className="text-lg font-bold">Edit Project</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-2">
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Project Name</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Project name..."
                autoFocus
              />
            </div>

            {/* Month */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Month</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={form.month}
                onChange={e => setForm({ ...form, month: Number(e.target.value) })}
              >
                {monthNames.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Pillar */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Pillar <span className="text-destructive">*</span>
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                value={form.pillar}
                onChange={e => setForm({ ...form, pillar: e.target.value as Pillar })}
              >
                {PILLARS.map(p => (
                  <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
                ))}
              </select>
            </div>

            {/* Link */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Link</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none transition-all"
                value={form.link}
                onChange={e => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Note</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none resize-none"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Optional note..."
              />
            </div>
          </div>
          <div className="pb-2" />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
