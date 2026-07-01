import { ReactNode, HTMLAttributes } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * GlassCard – a thin wrapper around the existing Card component that adds
 * a glass‑morphic background effect while preserving all Card props.
 */
export function GlassCard({ className, children, ...props }: CardProps & { children?: ReactNode }) {
  return (
    <Card
      {...props}
      className={cn(
        "bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl shadow-lg",
        className,
      )}
    >
      {children}
    </Card>
  );
}
