import React from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditHintProps {
  onClick: () => void;
  className?: string;
}

export function EditHint({ onClick, className }: EditHintProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity",
        "p-1.5 rounded-lg bg-background/80 hover:bg-muted border border-border shadow-sm",
        className,
      )}
      title="แก้ไข"
    >
      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );
}
