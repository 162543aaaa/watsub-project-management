// ─── Organisation system ──────────────────────────────────────
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  info: string;
  light: string;
  dark: string;
}

export interface LocationLinks {
  label: string;
  map_url: string;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface OrgMember {
  id: string;
  name: string;
  position: string;
  role_type: "leadership" | "core" | "specialist";
  parent_id: string | null;
  avatar_url: string | null;
}

export interface OrgTreeNode extends OrgMember {
  children: OrgTreeNode[];
}
// ─────────────────────────────────────────────────────────────

export interface Objective {
  id: string;
  title: string;
  period: string;
  year: number;
  owner_id: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  key_results?: KeyResult[];
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  initial_value: number;
  target_value: number;
  current_value: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
}
