import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";
import type {
  BrandColors,
  LocationLinks,
  OrgMember,
  OrgTreeNode,
  ResourceLink,
} from "@/types/index";

// ─── Re-export shared types so callers only need one import ──
export type { BrandColors, LocationLinks, OrgMember, OrgTreeNode, ResourceLink };

// ─── Extended CompanyInfo ─────────────────────────────────────
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

// ─── Internal aliases ──────────────────────────────────────────
type CompanyInfoRow = Database["public"]["Tables"]["company_info"]["Row"];
type EmployeeRow    = Database["public"]["Tables"]["employees"]["Row"];
type OrgMemberRow   = Database["public"]["Tables"]["organization_chart_members"]["Row"];

interface OrganizationStats {
  totalEmployees: number;
  leadershipCount: number;
  activeCount: number;
  teamModels: number;
}

// ─── JSON parse helpers ────────────────────────────────────────
function normalizeCoreValues(v: Json | null): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
function parseMilestones(v: Json): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
function parseLocationLinks(v: Json): LocationLinks | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, Json | undefined>;
  if (typeof o.label !== "string" || typeof o.map_url !== "string") return null;
  return { label: o.label, map_url: o.map_url };
}
function parseResources(v: Json): ResourceLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, Json | undefined> =>
      typeof x === "object" && x !== null && !Array.isArray(x))
    .map((x) => ({
      label: typeof x.label === "string" ? x.label : "",
      url:   typeof x.url   === "string" ? x.url   : "",
    }));
}
function parseBenefits(v: Json): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
function parseBrandColors(v: Json): BrandColors | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, Json | undefined>;
  if (
    typeof o.primary   !== "string" || typeof o.secondary !== "string" ||
    typeof o.accent    !== "string" || typeof o.info      !== "string" ||
    typeof o.light     !== "string" || typeof o.dark      !== "string"
  ) return null;
  return { primary: o.primary, secondary: o.secondary, accent: o.accent,
           info: o.info, light: o.light, dark: o.dark };
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
    history:        row.history ?? null,
    milestones:     parseMilestones(row.milestones),
    location_links: parseLocationLinks(row.location_links),
    resources:      parseResources(row.resources),
    benefits:       parseBenefits(row.benefits),
    brand_colors:   parseBrandColors(row.brand_colors),
  };
}

function toOrgMember(row: OrgMemberRow): OrgMember {
  const valid = ["leadership", "core", "specialist"] as const;
  const rt    = row.role_type as OrgMember["role_type"];
  return {
    id:        row.id,
    name:      row.name,
    position:  row.position,
    role_type: valid.includes(rt) ? rt : "core",
    parent_id: row.parent_id,
    avatar_url: row.avatar_url,
  };
}

// ─── Tree builder ──────────────────────────────────────────────
function buildOrgTree(members: OrgMember[]): OrgTreeNode[] {
  const map  = new Map<string, OrgTreeNode>();
  const roots: OrgTreeNode[] = [];
  for (const m of members) map.set(m.id, { ...m, children: [] });
  for (const m of members) {
    const node = map.get(m.id)!;
    if (m.parent_id && map.has(m.parent_id)) map.get(m.parent_id)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

// ─── Legacy helpers ────────────────────────────────────────────
function isLeadershipMember(e: EmployeeRow): boolean {
  return ["admin","manager","owner","superadmin","lead"].includes(e.role.toLowerCase()) ||
         /chief|head|lead|director|manager/i.test(e.position ?? "");
}
function buildTeamSummary(employees: EmployeeRow[]): TeamSummary[] {
  const total = employees.length;
  if (total === 0) return [];
  const byType = employees.reduce<Record<string,number>>((acc, e) => {
    const t = e.type?.trim() || "unspecified";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(byType)
    .map(([label, count]) => ({ label, total: count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

// ─── Payload → DB update ───────────────────────────────────────
function toDbUpdate(p: CompanyInfoUpdatePayload): Database["public"]["Tables"]["company_info"]["Update"] {
  const j = <T>(v: T | null | undefined): Json => (v ?? null) as unknown as Json;
  return {
    name:           p.name,
    tagline:        p.tagline,
    vision:         p.vision,
    mission:        p.mission,
    contact_email:  p.contact_email,
    logo_url:       p.logo_url,
    history:        p.history,
    milestones:     p.milestones    !== undefined ? j(p.milestones)     : undefined,
    location_links: p.location_links !== undefined ? j(p.location_links) : undefined,
    resources:      p.resources     !== undefined ? j(p.resources)      : undefined,
    benefits:       p.benefits      !== undefined ? j(p.benefits)       : undefined,
    brand_colors:   p.brand_colors  !== undefined ? j(p.brand_colors)   : undefined,
    updated_at:     new Date().toISOString(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────
export function useCompanyInfo() {
  const [companyInfo,   setCompanyInfo]   = useState<CompanyInfo | null>(null);
  const [orgMembers,    setOrgMembers]    = useState<OrgMember[]>([]);
  const [leadershipTeam,setLeadershipTeam]= useState<LeadershipMember[]>([]);
  const [allEmployees,  setAllEmployees]  = useState<EmployeeRow[]>([]);
  const [teamSummary,   setTeamSummary]   = useState<TeamSummary[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // ── CRITICAL: company_info ─────────────────────────────────
    const companyRes = await supabase
      .from("company_info")
      .select("*")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (companyRes.error) {
      setError(companyRes.error.message);
      setIsLoading(false);
      return; // don't block on other queries
    }
    setCompanyInfo(toCompanyInfo(companyRes.data ?? null));

    // ── NON-CRITICAL: employees ────────────────────────────────
    const employeesRes = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: true });

    const employees = employeesRes.error
      ? []
      : (employeesRes.data ?? []) as EmployeeRow[];

    setAllEmployees(employees);

    const leadership = employees
      .filter((e) => (e.active ?? true) && isLeadershipMember(e))
      .map((e) => ({ id: e.id, name: e.name, position: e.position,
                     avatar: e.avatar, role: e.role, type: e.type }));
    setLeadershipTeam(leadership);
    setTeamSummary(buildTeamSummary(employees.filter((e) => e.active ?? true)));

    // ── NON-CRITICAL: org_chart_members ───────────────────────
    // Table may not exist yet (migration not applied) — always soft-fail.
    try {
      const orgRes = await supabase
        .from("organization_chart_members")
        .select("*")
        .order("created_at", { ascending: true });

      if (!orgRes.error) {
        setOrgMembers((orgRes.data ?? []).map(toOrgMember));
      }
      // If error (table missing), orgMembers stays [] — page still loads.
    } catch {
      // Silently ignore — table doesn't exist yet.
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const orgTree = useMemo(() => buildOrgTree(orgMembers), [orgMembers]);

  const stats = useMemo<OrganizationStats>(() => {
    const active = allEmployees.filter((e) => e.active ?? true);
    return {
      totalEmployees: allEmployees.length,
      activeCount:    active.length,
      leadershipCount: leadershipTeam.length,
      teamModels: new Set(active.map((e) => e.type?.trim() || "unspecified")).size,
    };
  }, [allEmployees, leadershipTeam.length]);

  // ── Mutations ────────────────────────────────────────────────
  const updateCompanyInfo = useCallback(async (payload: CompanyInfoUpdatePayload) => {
    const { error: err } = await supabase
      .from("company_info")
      .update(toDbUpdate(payload))
      .eq("id", 1);
    if (err) throw new Error(err.message);
  }, []);

  const addOrgMember = useCallback(async (member: Omit<OrgMember, "id">): Promise<OrgMember> => {
    const { data, error: err } = await supabase
      .from("organization_chart_members")
      .insert({ name: member.name, position: member.position, role_type: member.role_type,
                parent_id: member.parent_id, avatar_url: member.avatar_url })
      .select().single();
    if (err) throw new Error(err.message);
    return toOrgMember(data as OrgMemberRow);
  }, []);

  const updateOrgMember = useCallback(async (id: string, member: Partial<Omit<OrgMember, "id">>) => {
    const { error: err } = await supabase
      .from("organization_chart_members").update(member).eq("id", id);
    if (err) throw new Error(err.message);
  }, []);

  const deleteOrgMember = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("organization_chart_members").delete().eq("id", id);
    if (err) throw new Error(err.message);
    void autoSyncToGoogleSheets("organization_chart_members", { id }, "delete");
  }, []);

  const refetch = useCallback(() => { void fetchData(); }, [fetchData]);

  return {
    companyInfo, orgTree, orgMembers,
    leadershipTeam, teamSummary, stats,
    isLoading, error,
    updateCompanyInfo, addOrgMember, updateOrgMember, deleteOrgMember, refetch,
  };
}
