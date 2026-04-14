import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type {
  BrandColors,
  LocationLinks,
  OrgMember,
  OrgTreeNode,
  ResourceLink,
} from "@/types/index";

// ─── Re-export shared types so callers only need one import ──
export type { BrandColors, LocationLinks, OrgMember, OrgTreeNode, ResourceLink };

// ─── Extended CompanyInfo (adds new JSONB fields) ─────────────
export interface CompanyInfo {
  id: number;
  name: string | null;
  tagline: string | null;
  vision: string | null;
  mission: string | null;
  core_values: string[];
  logo_url: string | null;
  contact_email: string | null;
  updated_at: string | null;
  history: string | null;
  milestones: string[];
  location_links: LocationLinks | null;
  resources: ResourceLink[];
  benefits: string[];
  brand_colors: BrandColors | null;
}

export type CompanyInfoUpdatePayload = Partial<
  Omit<CompanyInfo, "id" | "updated_at" | "core_values">
>;

// Legacy types kept for backward-compat
export interface LeadershipMember {
  id: string;
  name: string;
  position: string;
  avatar: string | null;
  role: string;
  type: string | null;
}

export interface TeamSummary {
  label: string;
  total: number;
  percentage: number;
}

// ─── Internal DB row aliases ───────────────────────────────────
type CompanyInfoRow = Database["public"]["Tables"]["company_info"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type OrgMemberRow =
  Database["public"]["Tables"]["organization_chart_members"]["Row"];

interface OrganizationStats {
  totalEmployees: number;
  leadershipCount: number;
  activeCount: number;
  teamModels: number;
}

// ─── JSON parse helpers ────────────────────────────────────────
function normalizeCoreValues(values: Json | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((v): v is string => typeof v === "string");
}

function parseMilestones(val: Json): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

function parseLocationLinks(val: Json): LocationLinks | null {
  if (!val || typeof val !== "object" || Array.isArray(val)) return null;
  const o = val as Record<string, Json | undefined>;
  if (typeof o.label !== "string" || typeof o.map_url !== "string") return null;
  return { label: o.label, map_url: o.map_url };
}

function parseResources(val: Json): ResourceLink[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter(
      (v): v is Record<string, Json | undefined> =>
        typeof v === "object" && v !== null && !Array.isArray(v),
    )
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : "",
      url: typeof item.url === "string" ? item.url : "",
    }));
}

function parseBenefits(val: Json): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

function parseBrandColors(val: Json): BrandColors | null {
  if (!val || typeof val !== "object" || Array.isArray(val)) return null;
  const o = val as Record<string, Json | undefined>;
  if (
    typeof o.primary !== "string" ||
    typeof o.secondary !== "string" ||
    typeof o.accent !== "string" ||
    typeof o.info !== "string" ||
    typeof o.light !== "string" ||
    typeof o.dark !== "string"
  )
    return null;
  return {
    primary: o.primary,
    secondary: o.secondary,
    accent: o.accent,
    info: o.info,
    light: o.light,
    dark: o.dark,
  };
}

function toCompanyInfo(row: CompanyInfoRow | null): CompanyInfo | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    vision: row.vision,
    mission: row.mission,
    core_values: normalizeCoreValues(row.core_values),
    logo_url: row.logo_url,
    contact_email: row.contact_email,
    updated_at: row.updated_at,
    history: row.history ?? null,
    milestones: parseMilestones(row.milestones),
    location_links: parseLocationLinks(row.location_links),
    resources: parseResources(row.resources),
    benefits: parseBenefits(row.benefits),
    brand_colors: parseBrandColors(row.brand_colors),
  };
}

function toOrgMember(row: OrgMemberRow): OrgMember {
  const roleType = row.role_type as OrgMember["role_type"];
  const validTypes = ["leadership", "core", "specialist"] as const;
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    role_type: validTypes.includes(roleType) ? roleType : "core",
    parent_id: row.parent_id,
    avatar_url: row.avatar_url,
  };
}

// ─── Tree builder ──────────────────────────────────────────────
function buildOrgTree(members: OrgMember[]): OrgTreeNode[] {
  const map = new Map<string, OrgTreeNode>();
  const roots: OrgTreeNode[] = [];

  for (const m of members) {
    map.set(m.id, { ...m, children: [] });
  }
  for (const m of members) {
    const node = map.get(m.id)!;
    if (m.parent_id && map.has(m.parent_id)) {
      map.get(m.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─── Legacy helpers ────────────────────────────────────────────
function isLeadershipMember(employee: EmployeeRow): boolean {
  const leadershipRoles = ["admin", "manager", "owner", "superadmin", "lead"];
  const byRole = leadershipRoles.includes(employee.role.toLowerCase());
  const byTitle = /chief|head|lead|director|manager/i.test(
    employee.position ?? "",
  );
  return byRole || byTitle;
}

function buildTeamSummary(employees: EmployeeRow[]): TeamSummary[] {
  const total = employees.length;
  if (total === 0) return [];
  const byType = employees.reduce<Record<string, number>>((acc, e) => {
    const type = e.type?.trim() || "unspecified";
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(byType)
    .map(([label, count]) => ({
      label,
      total: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── Payload → DB Update helper ────────────────────────────────
function toDbUpdate(
  payload: CompanyInfoUpdatePayload,
): Database["public"]["Tables"]["company_info"]["Update"] {
  const toJson = <T>(v: T | null | undefined): Json =>
    (v ?? null) as unknown as Json;

  return {
    name: payload.name,
    tagline: payload.tagline,
    vision: payload.vision,
    mission: payload.mission,
    contact_email: payload.contact_email,
    logo_url: payload.logo_url,
    history: payload.history,
    milestones: payload.milestones !== undefined ? toJson(payload.milestones) : undefined,
    location_links: payload.location_links !== undefined ? toJson(payload.location_links) : undefined,
    resources: payload.resources !== undefined ? toJson(payload.resources) : undefined,
    benefits: payload.benefits !== undefined ? toJson(payload.benefits) : undefined,
    brand_colors: payload.brand_colors !== undefined ? toJson(payload.brand_colors) : undefined,
    updated_at: new Date().toISOString(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────
export function useCompanyInfo() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [leadershipTeam, setLeadershipTeam] = useState<LeadershipMember[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeRow[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [companyRes, employeesRes, orgRes] = await Promise.all([
      supabase
        .from("company_info")
        .select("*")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("organization_chart_members")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

    if (companyRes.error) setError(companyRes.error.message);
    if (employeesRes.error) setError(employeesRes.error.message);
    // org members table may not exist yet in older envs — soft-fail
    if (orgRes.error && !orgRes.error.message.includes("does not exist")) {
      setError(orgRes.error.message);
    }

    const company = toCompanyInfo(companyRes.data ?? null);
    const employees = (employeesRes.data ?? []) as EmployeeRow[];
    const rawOrgMembers = (orgRes.data ?? []) as OrgMemberRow[];

    setCompanyInfo(company);
    setAllEmployees(employees);
    setOrgMembers(rawOrgMembers.map(toOrgMember));

    const leadership = employees
      .filter((e) => (e.active ?? true) && isLeadershipMember(e))
      .map((e) => ({
        id: e.id,
        name: e.name,
        position: e.position,
        avatar: e.avatar,
        role: e.role,
        type: e.type,
      }));

    setLeadershipTeam(leadership);
    setTeamSummary(
      buildTeamSummary(employees.filter((e) => e.active ?? true)),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Derived: org tree ────────────────────────────────────────
  const orgTree = useMemo(() => buildOrgTree(orgMembers), [orgMembers]);

  // ── Derived: stats ───────────────────────────────────────────
  const stats = useMemo<OrganizationStats>(() => {
    const active = allEmployees.filter((e) => e.active ?? true);
    return {
      totalEmployees: allEmployees.length,
      activeCount: active.length,
      leadershipCount: leadershipTeam.length,
      teamModels: new Set(
        active.map((e) => e.type?.trim() || "unspecified"),
      ).size,
    };
  }, [allEmployees, leadershipTeam.length]);

  // ── Mutations ────────────────────────────────────────────────
  const updateCompanyInfo = useCallback(
    async (payload: CompanyInfoUpdatePayload) => {
      const { error: err } = await supabase
        .from("company_info")
        .update(toDbUpdate(payload))
        .eq("id", 1);
      if (err) throw new Error(err.message);
    },
    [],
  );

  const addOrgMember = useCallback(
    async (
      member: Omit<OrgMember, "id">,
    ): Promise<OrgMember> => {
      const { data, error: err } = await supabase
        .from("organization_chart_members")
        .insert({
          name: member.name,
          position: member.position,
          role_type: member.role_type,
          parent_id: member.parent_id,
          avatar_url: member.avatar_url,
        })
        .select()
        .single();
      if (err) throw new Error(err.message);
      return toOrgMember(data as OrgMemberRow);
    },
    [],
  );

  const updateOrgMember = useCallback(
    async (id: string, member: Partial<Omit<OrgMember, "id">>) => {
      const { error: err } = await supabase
        .from("organization_chart_members")
        .update(member)
        .eq("id", id);
      if (err) throw new Error(err.message);
    },
    [],
  );

  const deleteOrgMember = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("organization_chart_members")
      .delete()
      .eq("id", id);
    if (err) throw new Error(err.message);
  }, []);

  const refetch = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return {
    companyInfo,
    orgTree,
    orgMembers,
    leadershipTeam,
    teamSummary,
    stats,
    isLoading,
    error,
    updateCompanyInfo,
    addOrgMember,
    updateOrgMember,
    deleteOrgMember,
    refetch,
  };
}
