import { useEffect, useState } from "react";
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

type CompanyInfoRow = Database["public"]["Tables"]["company_info"]["Row"];

type EmployeeLeadershipRow = Pick<
  Database["public"]["Tables"]["employees"]["Row"],
  "id" | "name" | "position" | "avatar" | "role" | "type" | "active"
>;

const FALLBACK_COMPANY_INFO: CompanyInfo = {
  id: 1,
  name: "Watsub",
  tagline: "Empowering project management",
  vision: "To be the leading platform for team collaboration.",
  mission: "We build intuitive tools that help teams deliver projects on time.",
  core_values: ["Innovation", "Integrity", "Teamwork"],
  logo_url: null,
  contact_email: null,
  updated_at: null,
};

function normalizeCoreValues(values: CompanyInfoRow["core_values"]): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string");
}

export function useCompanyInfo() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [leadershipTeam, setLeadershipTeam] = useState<LeadershipMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      setIsLoading(true);
      setError(null);

      let nextCompanyInfo = FALLBACK_COMPANY_INFO;
      let nextLeadershipTeam: LeadershipMember[] = [];
      let companyErrorMessage: string | null = null;
      let leadershipErrorMessage: string | null = null;

      const companyRes = await supabase.from("company_info").select("*").eq("id", 1).maybeSingle();
      if (companyRes.error) {
        companyErrorMessage = companyRes.error.message;
      } else if (companyRes.data) {
        const company = companyRes.data as CompanyInfoRow;
        nextCompanyInfo = {
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

      const leadershipRes = await supabase
        .from("employees")
        .select("id, name, position, avatar, role, type, active")
        .or("role.eq.admin,type.eq.fulltime")
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(5);

      if (leadershipRes.error) {
        leadershipErrorMessage = leadershipRes.error.message;
      } else {
        const leaders = (leadershipRes.data ?? []) as EmployeeLeadershipRow[];
        nextLeadershipTeam = leaders.map((member) => ({
          id: member.id,
          name: member.name,
          position: member.position,
          avatar: member.avatar,
          role: member.role,
          type: member.type,
        }));
      }

      setCompanyInfo(nextCompanyInfo);
      setLeadershipTeam(nextLeadershipTeam);

      if (companyErrorMessage && leadershipErrorMessage) {
        setError(`Company info + leadership fetch failed: ${companyErrorMessage}`);
      } else if (leadershipErrorMessage) {
        setError(`Leadership fetch failed: ${leadershipErrorMessage}`);
      } else {
        // If company_info fetch fails, keep fallback data without hard-failing the page.
        setError(null);
      }

      setIsLoading(false);
    };

    fetchOrganizationData();
  }, []);

  return { companyInfo, leadershipTeam, isLoading, error };
}
