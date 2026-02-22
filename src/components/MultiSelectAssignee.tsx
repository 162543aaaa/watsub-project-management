import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Search, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  name: string;
  avatar?: string;
}

interface MultiSelectAssigneeProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  employees: Employee[];
}

function getInitial(name: string) {
  return (name.trim().split(/\s+/)[0]?.[0] || "").toUpperCase();
}

function getAvatarUrl(avatar?: string): string | null {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  const { data } = supabase.storage.from("employee-assets").getPublicUrl(avatar);
  return data?.publicUrl || null;
}

function Avatar({ avatar, name, size = "sm" }: { avatar?: string; name: string; size?: "sm" | "md" }) {
  const url = getAvatarUrl(avatar);
  const cls = size === "sm" ? "w-4 h-4" : "w-8 h-8";
  const textCls = size === "sm" ? "text-[8px]" : "text-xs";

  if (url) {
    return <img src={url} alt="" className={`${cls} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${cls} rounded-full bg-muted flex items-center justify-center ${textCls} font-bold text-muted-foreground flex-shrink-0`}>
      {getInitial(name)}
    </div>
  );
}

export default function MultiSelectAssignee({ selected, onChange, employees }: MultiSelectAssigneeProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter(s => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(name => {
            const emp = employees.find(e => e.name === name);
            return (
              <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary">
                <Avatar avatar={emp?.avatar} name={name} size="sm" />
                {name}
                <button onClick={() => onChange(selected.filter(s => s !== name))} className="hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none hover:border-primary/50 transition-colors"
      >
        <span className="text-muted-foreground">{open ? "Close" : "Select members..."}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border-2 border-primary/30 rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="Search team members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No members found</p>
            ) : (
              filtered.map(emp => {
                const isSelected = selected.includes(emp.name);
                return (
                  <button
                    key={emp.name}
                    type="button"
                    onClick={() => toggle(emp.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/80 transition-colors text-left ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
                    )}
                    <Avatar avatar={emp.avatar} name={emp.name} size="md" />
                    <span className={`font-medium ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                      {emp.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-center text-xs text-muted-foreground hover:text-destructive font-medium py-1.5 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
