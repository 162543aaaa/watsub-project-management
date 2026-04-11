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
