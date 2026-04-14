import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

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
  location: string | null;
  location_link: string | null;
  leadership_agreement: string | null;
  handbook_url: string | null;
  brand_assets_url: string | null;
  benefits_summary: string | null;
  brand_colors: Array<{ label: string; hex: string }>;
}

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

export interface OrgMember {
  id: string;
  name: string;
  role: string;
  detail: string;
  group_key: "leadership" | "core" | "specialist";
  sort_order: number;
}

type CompanyInfoRow = Database["public"]["Tables"]["company_info"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type OrgChartRow = Database["public"]["Tables"]["organization_chart_members"]["Row"];

interface OrganizationStats {
  totalEmployees: number;
  leadershipCount: number;
  activeCount: number;
  teamModels: number;
}

function normalizeStringArray(values: Json | null | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string");
}

function normalizeBrandColors(values: Json | null | undefined): Array<{ label: string; hex: string }> {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null)
    .map((value) => ({
      label: String(value.label ?? ""),
      hex: String(value.hex ?? ""),
    }))
    .filter((value) => value.label && value.hex);
}

function toCompanyInfo(company: CompanyInfoRow | null): CompanyInfo | null {
  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    tagline: company.tagline,
    vision: company.vision,
    mission: company.mission,
    core_values: normalizeStringArray(company.core_values),
    logo_url: company.logo_url,
    contact_email: company.contact_email,
    updated_at: company.updated_at,
    history: company.history,
    milestones: normalizeStringArray(company.milestones),
    location: company.location,
    location_link: company.location_link,
    leadership_agreement: company.leadership_agreement,
    handbook_url: company.handbook_url,
    brand_assets_url: company.brand_assets_url,
    benefits_summary: company.benefits_summary,
    brand_colors: normalizeBrandColors(company.brand_colors),
  };
}

function isLeadershipMember(employee: EmployeeRow): boolean {
  const leadershipRoles = ["admin", "manager", "owner", "superadmin", "lead"];
  const byRole = leadershipRoles.includes(employee.role.toLowerCase());
  const byTitle = /chief|head|lead|director|manager/i.test(employee.position ?? "");
  return byRole || byTitle;
}

function buildTeamSummary(employees: EmployeeRow[]): TeamSummary[] {
  const total = employees.length;
  if (total === 0) return [];

  const byType = employees.reduce<Record<string, number>>((acc, employee) => {
    const type = employee.type?.trim() || "unspecified";
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

export function useCompanyInfo() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [leadershipTeam, setLeadershipTeam] = useState<LeadershipMember[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeRow[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizationData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [companyRes, employeesRes, orgMembersRes] = await Promise.all([
      supabase.from("company_info").select("*").order("id", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("employees").select("*").order("created_at", { ascending: true }),
      supabase
        .from("organization_chart_members")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    const nextError = companyRes.error?.message ?? employeesRes.error?.message ?? orgMembersRes.error?.message ?? null;
    if (nextError) setError(nextError);

    const company = toCompanyInfo(companyRes.data ?? null);
    const employees = (employeesRes.data ?? []) as EmployeeRow[];
    const chartMembers = ((orgMembersRes.data ?? []) as OrgChartRow[]).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      detail: member.detail,
      group_key: member.group_key,
      sort_order: member.sort_order ?? 0,
    }));

    setCompanyInfo(company);
    setAllEmployees(employees);
    setOrgMembers(chartMembers);

    const leadership = employees
      .filter((employee) => (employee.active ?? true) && isLeadershipMember(employee))
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        position: employee.position,
        avatar: employee.avatar,
        role: employee.role,
        type: employee.type,
      }));

    setLeadershipTeam(leadership);
    setTeamSummary(buildTeamSummary(employees.filter((employee) => employee.active ?? true)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchOrganizationData();
  }, [fetchOrganizationData]);

  const stats = useMemo<OrganizationStats>(() => {
    const activeEmployees = allEmployees.filter((employee) => employee.active ?? true);
    return {
      totalEmployees: allEmployees.length,
      activeCount: activeEmployees.length,
      leadershipCount: leadershipTeam.length,
      teamModels: new Set(activeEmployees.map((employee) => employee.type?.trim() || "unspecified")).size,
    };
  }, [allEmployees, leadershipTeam.length]);

  return {
    companyInfo,
    leadershipTeam,
    teamSummary,
    orgMembers,
    stats,
    isLoading,
    error,
    refetch: fetchOrganizationData,
  };
}
