import { SupabaseClient } from "@supabase/supabase-js";
import { Employee } from "@/hooks/useEmployees";
import { Database } from "@/integrations/supabase/types";

export const resolveCurrentEmployee = async (supabase: SupabaseClient<Database>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('email', user.email)
    .maybeSingle();
  return error ? null : (data as Employee);
};

export const isIntern = (emp: Employee | null) => emp?.role === 'intern';

export const visibleEmployeeNames = (emp: Employee | null, employees: Employee[]) => {
  if (!emp) return [];
  if (emp.role === 'intern') {
    const internNames = employees.filter(e => e.role === 'intern').map(e => e.name);
    return Array.from(new Set([emp.name, ...internNames]));
  }
  return employees.map(e => e.name);
};
