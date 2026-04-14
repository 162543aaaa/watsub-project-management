import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

type CompanyInfoRow = Database["public"]["Tables"]["company_info"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];

interface OrganizationStats {
  totalEmployees: number;
  leadershipCount: number;
  activeCount: number;
  teamModels: number;
}

function normalizeCoreValues(values: CompanyInfoRow["core_values"]): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string");
}

function toCompanyInfo(company: CompanyInfoRow | null): CompanyInfo | null {
  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    tagline: company.tagline,
    vision: company.vision,
    mission: company.mission,
    core_values: normalizeCoreValues(company.core_values),
    logo_url: company.logo_url,
    contact_email: company.contact_email,
    updated_at: company.updated_at,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      setIsLoading(true);
      setError(null);

      const [companyRes, employeesRes] = await Promise.all([
        supabase.from("company_info").select("*").order("id", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("employees").select("*").order("created_at", { ascending: true }),
      ]);

      if (companyRes.error) {
        setError(companyRes.error.message);
      }

      if (employeesRes.error) {
        setError(employeesRes.error.message);
      }

      const company = toCompanyInfo(companyRes.data ?? null);
      const employees = (employeesRes.data ?? []) as EmployeeRow[];

      setCompanyInfo(company);
      setAllEmployees(employees);

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
    };

    fetchOrganizationData();
  }, []);

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
    stats,
    isLoading,
    error,
  };
}
