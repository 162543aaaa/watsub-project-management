import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgTreeNode } from "@/hooks/useCompanyInfo";

// ─── Visual style map per role type ───────────────────────────
const ROLE_STYLE = {
  leadership: {
    card: "border-[#D2FA00] bg-[#D2FA00]/15 hover:bg-[#D2FA00]/25",
    avatar: "bg-[#D2FA00]/40 text-[#0D0D0D]",
    badge: "bg-[#D2FA00] text-[#0D0D0D] border-0",
    label: "Leadership",
  },
  core: {
    card: "border-[#3EADD4] bg-[#3EADD4]/10 hover:bg-[#3EADD4]/20",
    avatar: "bg-[#3EADD4]/25 text-[#3EADD4]",
    badge: "bg-[#3EADD4]/20 text-[#3EADD4] border-0",
    label: "Core",
  },
  specialist: {
    card: "border-[#F4622A] bg-[#F4622A]/10 hover:bg-[#F4622A]/20",
    avatar: "bg-[#F4622A]/20 text-[#F4622A]",
    badge: "bg-[#F4622A]/20 text-[#F4622A] border-0",
    label: "Specialist",
  },
} as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Single node (recursive) ───────────────────────────────────
function OrgChartNode({
  node,
  isRoot = false,
}: {
  node: OrgTreeNode;
  isRoot?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const style = ROLE_STYLE[node.role_type] ?? ROLE_STYLE.core;

  return (
    <div className="flex flex-col items-center">
      {/* Vertical connector FROM parent */}
      {!isRoot && <div className="w-px h-6 bg-border/60 flex-shrink-0" />}

      {/* Node card */}
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={cn(
          "rounded-xl border-2 p-3 w-44 text-center transition-all shadow-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          hasChildren ? "cursor-pointer" : "cursor-default",
          style.card,
        )}
      >
        {/* Avatar / initials */}
        <div
          className={cn(
            "w-10 h-10 rounded-full mx-auto flex items-center justify-center",
            "text-sm font-bold mb-2 overflow-hidden",
            style.avatar,
          )}
        >
          {node.avatar_url ? (
            <img
              src={node.avatar_url}
              alt={node.name}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(node.name)
          )}
        </div>

        {/* Name */}
        <p className="text-xs font-semibold leading-tight text-foreground">
          {node.name}
        </p>

        {/* Position */}
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {node.position}
        </p>

        {/* Role badge */}
        <span
          className={cn(
            "inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide",
            style.badge,
          )}
        >
          {style.label}
        </span>

        {/* Expand / collapse indicator */}
        {hasChildren && (
          <div className="mt-1 flex justify-center text-muted-foreground">
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </div>
        )}
      </button>

      {/* Children subtree */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center">
          {/* Vertical line down to horizontal bar */}
          <div className="w-px h-5 bg-border/60" />

          {/* Children arranged horizontally */}
          <div className="relative flex items-start">
            {/* Horizontal connector bar spanning all children */}
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border/60"
                style={{
                  // Spans from center of first child to center of last child
                  left: `${100 / (2 * node.children.length)}%`,
                  right: `${100 / (2 * node.children.length)}%`,
                }}
              />
            )}

            {node.children.map((child) => (
              <div
                key={child.id}
                className="flex flex-col items-center flex-1 min-w-[176px]"
              >
                <OrgChartNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────
interface InteractiveOrgChartProps {
  tree: OrgTreeNode[];
}

export function InteractiveOrgChart({ tree }: InteractiveOrgChartProps) {
  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <Users className="w-8 h-8" />
        <p className="text-sm">ยังไม่มีข้อมูลโครงสร้างทีม</p>
        <p className="text-xs">Admin สามารถเพิ่มสมาชิกผ่านปุ่ม Edit Organization</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-12 min-w-max justify-center py-4">
        {tree.map((root) => (
          <OrgChartNode key={root.id} node={root} isRoot />
        ))}
      </div>
    </div>
  );
}
