import { BoltIcon } from "@heroicons/react/24/solid";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtilizationBar } from "./UtilizationBar";
import type { WorkloadData } from "@/hooks/useWorkload";
import { DEFAULT_WEEKLY_CAPACITY } from "@/hooks/useWorkload";
import type { StatPillVariant } from "./StatPill";
import { cn } from "@/lib/utils";

export function getTier(pct: number): StatPillVariant {
  if (pct > 100) return "destructive";
  if (pct >= 75) return "warning";
  if (pct > 0) return "success";
  return "default";
}

const tierConfig: Record<
  StatPillVariant,
  { border: string; accent: string; badge: string; label: string; text: string }
> = {
  destructive: {
    border: "border-destructive/30 hover:border-destructive/50",
    accent: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    text: "text-destructive",
    label: "Overloaded",
  },
  warning: {
    border: "border-amber-500/30 hover:border-amber-500/50",
    accent: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-500",
    label: "Nearing Limit",
  },
  success: {
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    accent: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-500",
    label: "Normal",
  },
  default: {
    border: "border-border hover:border-border/80",
    accent: "bg-muted-foreground/30",
    badge: "bg-muted text-muted-foreground border-border",
    text: "text-muted-foreground",
    label: "Available",
  },
};

interface EmployeeCardProps {
  item: WorkloadData;
  index: number;
  onOpenDetails: (employee: WorkloadData) => void;
}

export function EmployeeCard({ item, index, onOpenDetails }: EmployeeCardProps) {
  const tier = getTier(item.utilization_percentage);
  const cfg = tierConfig[tier];

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails(item);
        }
      }}
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer group bg-card",
        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)]",
        "hover:-translate-y-0.5",
        cfg.border
      )}
    >
      {/* Tier accent strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 transition-colors", cfg.accent)} />

      <CardContent className="p-5 pt-6">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-5">
          <EmployeeAvatar
            name={item.display_name}
            avatar={item.avatar_url ?? undefined}
            size="md"
            index={index}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
              {item.display_name}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {item.position || "Team Member"}
            </p>
          </div>
          {/* Tier badge */}
          <span
            className={cn(
              "text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 border",
              cfg.badge
            )}
          >
            {cfg.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-3 bg-muted/40 rounded-lg p-2 px-3 border border-border/50">
          <div className="flex items-center gap-2">
            <BoltIcon className={cn("w-4 h-4", cfg.text)} />
            <span className="text-xs text-muted-foreground font-medium">
              <span className="font-bold text-foreground">
                {item.active_tasks_count}
              </span>{" "}
              active task{item.active_tasks_count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            <span className="font-bold text-foreground">
              {item.total_estimated_hours}h
            </span>{" "}
            / {DEFAULT_WEEKLY_CAPACITY}h
          </div>
        </div>

        {/* Progress bar */}
        <UtilizationBar pct={item.utilization_percentage} variant={tier} />

        {/* Utilization % label */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs font-medium text-muted-foreground">Utilization</span>
          <span className={cn("text-xs font-bold tabular-nums", cfg.text)}>
            {item.utilization_percentage}%
            {item.utilization_percentage > 100 && (
              <span className="ml-1 text-[10px] font-medium opacity-80">
                (+{item.utilization_percentage - 100}% over)
              </span>
            )}
          </span>
        </div>

        <div className="mt-5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(item);
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
