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

    fetchOrganizationData();
  }, []);

  return { companyInfo, leadershipTeam, isLoading, error };
}
