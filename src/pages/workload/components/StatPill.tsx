import { cn } from "@/lib/utils";

export type StatPillVariant = "default" | "destructive" | "warning" | "success";

interface StatPillProps {
  label: string;
  value: number | string;
  variant?: StatPillVariant;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

const variantConfig: Record<StatPillVariant, { wrapper: string; icon: string; text: string }> = {
  default: {
    wrapper: "bg-muted/50 border-border/60",
    icon: "text-muted-foreground",
    text: "text-foreground",
  },
  destructive: {
    wrapper: "bg-destructive/10 border-destructive/20",
    icon: "text-destructive",
    text: "text-destructive",
  },
  warning: {
    wrapper: "bg-amber-500/10 border-amber-500/20",
    icon: "text-amber-500",
    text: "text-amber-600 dark:text-amber-500",
  },
  success: {
    wrapper: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-500",
    text: "text-emerald-700 dark:text-emerald-500",
  },
};

export function StatPill({ label, value, variant = "default", icon: Icon, className }: StatPillProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-sm transition-all duration-300",
        config.wrapper,
        className
      )}
    >
      <div className={cn("p-2 rounded-xl bg-background/50 shadow-sm", config.icon)}>
        <Icon className="w-5 h-5 flex-shrink-0" />
      </div>
      <div>
        <div className={cn("text-xl font-bold leading-none tracking-tight mb-1", config.text)}>
          {value}
        </div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
