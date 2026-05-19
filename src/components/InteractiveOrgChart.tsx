import { ChevronDownIcon, ChevronUpIcon, UsersIcon } from '@heroicons/react/24/solid';
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BrandColors, OrgTreeNode } from "@/hooks/useCompanyInfo";

// ─── Default brand colors (fallback) ──────────────────────────
const DEFAULT_COLORS: BrandColors = {
  primary: "#D2FA00", secondary: "#F4622A", accent: "#6B3FA0",
  info: "#3EADD4",   light: "#F5F0E8",     dark: "#0D0D0D",
};

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Single node ───────────────────────────────────────────────
function OrgChartNode({
  node, isRoot = false, brandColors,
}: {
  node: OrgTreeNode;
  isRoot?: boolean;
  brandColors: BrandColors;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  // Role-specific colours derived from brandColors
  const ROLE_STYLE = {
    leadership: {
      card:   `border-[${brandColors.primary}] bg-[${brandColors.primary}]/12 hover:bg-[${brandColors.primary}]/20`,
      avatar: `bg-[${brandColors.primary}]/35 text-[${brandColors.dark}]`,
      badge:  brandColors.primary,
      label:  "Leadership",
    },
    core: {
      card:   `border-[${brandColors.info}] bg-[${brandColors.info}]/10 hover:bg-[${brandColors.info}]/18`,
      avatar: `bg-[${brandColors.info}]/25 text-[${brandColors.info}]`,
      badge:  brandColors.info,
      label:  "Core",
    },
    specialist: {
      card:   `border-[${brandColors.secondary}] bg-[${brandColors.secondary}]/10 hover:bg-[${brandColors.secondary}]/18`,
      avatar: `bg-[${brandColors.secondary}]/20 text-[${brandColors.secondary}]`,
      badge:  brandColors.secondary,
      label:  "Specialist",
    },
  } as const;

  // Inline styles (Tailwind JIT can't pick up dynamic hex values)
  const roleColors = {
    leadership: { border: brandColors.primary, bg: `${brandColors.primary}20`, avatarBg: `${brandColors.primary}40`, text: brandColors.dark  },
    core:       { border: brandColors.info,    bg: `${brandColors.info}18`,    avatarBg: `${brandColors.info}30`,    text: brandColors.info   },
    specialist: { border: brandColors.secondary, bg: `${brandColors.secondary}18`, avatarBg: `${brandColors.secondary}28`, text: brandColors.secondary },
  };
  const c = roleColors[node.role_type] ?? roleColors.core;
  const s = ROLE_STYLE[node.role_type] ?? ROLE_STYLE.core;

  return (
    <div className="flex flex-col items-center">
      {/* Vertical connector from parent */}
      {!isRoot && <div className="w-px h-6 bg-border/50 flex-shrink-0" />}

      {/* Node card */}
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={cn(
          "rounded-2xl border-2 p-3 w-44 text-center transition-all shadow-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          hasChildren ? "cursor-pointer" : "cursor-default",
        )}
        style={{ borderColor: c.border, backgroundColor: c.bg }}
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full mx-auto flex items-center justify-center text-sm font-bold mb-2 overflow-hidden"
          style={{ backgroundColor: c.avatarBg, color: c.text }}
        >
          {node.avatar_url ? (
            <img src={node.avatar_url} alt={node.name} className="w-full h-full object-cover" />
          ) : (
            getInitials(node.name)
          )}
        </div>

        <p className="text-xs font-semibold leading-tight text-foreground">{node.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{node.position}</p>

        {/* Role pill */}
        <span
          className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold"
          style={{ backgroundColor: `${c.border}28`, color: c.text === brandColors.dark ? brandColors.dark : c.text }}
        >
          {s.label}
        </span>

        {hasChildren && (
          <div className="mt-1 flex justify-center text-muted-foreground">
            {expanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          </div>
        )}
      </button>

      {/* Children subtree */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center">
          <div className="w-px h-5 bg-border/50" />
          <div className="relative flex items-start">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border/50"
                style={{
                  left:  `${100 / (2 * node.children.length)}%`,
                  right: `${100 / (2 * node.children.length)}%`,
                }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center flex-1 min-w-[176px]">
                <OrgChartNode node={child} brandColors={brandColors} />
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
  tree:        OrgTreeNode[];
  brandColors?: BrandColors;
}

export function InteractiveOrgChart({
  tree, brandColors = DEFAULT_COLORS,
}: InteractiveOrgChartProps) {
  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${brandColors.primary}20` }}
        >
          <UsersIcon className="w-7 h-7" style={{ color: brandColors.primary }} />
        </div>
        <p className="text-sm font-medium">ยังไม่มีข้อมูลโครงสร้างทีม</p>
        <p className="text-xs text-center max-w-xs">
          Admin สามารถ apply migration SQL จาก{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
            supabase/migrations/20260414120000_upgrade_org_system.sql
          </code>{" "}
          ใน Supabase Dashboard แล้วเพิ่มสมาชิกผ่าน Edit Organization
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-12 min-w-max justify-center py-4">
        {tree.map((root) => (
          <OrgChartNode key={root.id} node={root} isRoot brandColors={brandColors} />
        ))}
      </div>
    </div>
  );
}
