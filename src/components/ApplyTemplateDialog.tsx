import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useState } from "react";
import { createPortal } from "react-dom";
import { TASK_TEMPLATES, expandTemplate } from "@/config/taskTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ApplyTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Either projectId or customerId must be provided. */
  projectId?: string;
  customerId?: string;
  /** Called after tasks are created so the parent can refetch. */
  onApplied?: () => void;
}

export default function ApplyTemplateDialog({
  isOpen,
  onClose,
  projectId,
  customerId,
  onApplied,
}: ApplyTemplateDialogProps) {
  const [templateId, setTemplateId] = useState<string>(TASK_TEMPLATES[0].id);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const apply = async () => {
    const tpl = TASK_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setBusy(true);
    try {
      const payloads = expandTemplate(tpl, { startDate, projectId, customerId });
      const { error } = await supabase.from("tasks").insert(payloads);
      if (error) throw error;
      toast({ title: `เพิ่ม ${payloads.length} งานจากเทมเพลตแล้ว!` });
      onApplied?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border flex flex-col" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-primary" /> Apply Task Template
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Template</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {TASK_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start date</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="border border-border/60 rounded-xl p-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Preview</p>
            <ul className="space-y-1">
              {TASK_TEMPLATES.find((t) => t.id === templateId)?.tasks.map((t, i) => (
                <li key={i} className="text-xs flex items-center justify-between">
                  <span>{t.name}</span>
                  <span className="text-muted-foreground">+{t.dueOffsetDays}d · {t.priority}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={apply} disabled={busy} className="flex-1 btn-primary">
            {busy ? "Adding…" : "Add tasks"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}