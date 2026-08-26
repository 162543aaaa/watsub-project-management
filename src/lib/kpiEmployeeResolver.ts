import type { Employee } from "@/hooks/useEmployees";

type KpiIdentity = {
  email?: string | null;
  profileDisplayName?: string | null;
  userMetadataDisplayName?: string | null;
};

const normalize = (value?: string | null) => value?.trim().toLocaleLowerCase() ?? "";

/** Resolves a KPI user from email first, then their legacy display name. */
export function resolveKpiEmployee(identity: KpiIdentity, employees: Employee[]): Employee | null {
  const email = normalize(identity.email);
  if (email) {
    const emailMatch = employees.find((employee) => normalize(employee.email) === email);
    if (emailMatch) return emailMatch;
  }

  const displayNames = [identity.profileDisplayName, identity.userMetadataDisplayName]
    .map(normalize)
    .filter(Boolean);

  for (const displayName of displayNames) {
    const matches = employees.filter((employee) => normalize(employee.name) === displayName);
    if (matches.length === 1) return matches[0];
  }

  return null;
}
