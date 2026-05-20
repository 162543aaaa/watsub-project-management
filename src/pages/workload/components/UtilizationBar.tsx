import { cn } from "@/lib/utils";
import type { StatPillVariant } from "./StatPill";

interface UtilizationBarProps {
  pct: number;
  variant: StatPillVariant;
  className?: string;
}

const progressConfig: Record<StatPillVariant, string> = {
  default: "bg-muted-foreground/30",
  success: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
  warning: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
  destructive: "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.4)]",
};

export function UtilizationBar({ pct, variant, className }: UtilizationBarProps) {
  const clampedPct = Math.min(Math.max(pct, 0), 100);
  const overflowPct = pct > 100 ? Math.min(pct - 100, 30) : 0; // Visual overflow hint up to 130%

  return (
    <div className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/40 backdrop-blur-sm", className)}>
      {/* Base fill */}
      <div
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-in-out",
          progressConfig[variant]
        )}
        style={{ transform: `translateX(-${100 - clampedPct}%)` }}
      />
      
      {/* Overflow stripes (>100%) */}
      {overflowPct > 0 && (
        <div
          className="absolute inset-y-0 right-0 h-full opacity-80"
          style={{
            width: `${overflowPct}%`,
            background: `repeating-linear-gradient(
              45deg,
              hsl(var(--destructive) / 0.5),
              hsl(var(--destructive) / 0.5) 4px,
              transparent 4px,
              transparent 8px
            )`,
          }}
        />
      )}
    </div>
  );
}
