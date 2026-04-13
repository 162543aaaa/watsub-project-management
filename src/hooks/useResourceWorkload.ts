import { useState, useEffect, useCallback } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface WorkloadData {
  employee_id: string;
  employee_name: string;
  active_tasks_count: number;
  total_estimated_hours: number;
}

export function useResourceWorkload(startDate?: string, endDate?: string) {
  const defaultStart = format(new Date(), "yyyy-MM-dd");
  const defaultEnd = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const resolvedStart = startDate ?? defaultStart;
  const resolvedEnd = endDate ?? defaultEnd;

  const [data, setData] = useState<WorkloadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_resource_workload",
        {
          start_date: resolvedStart,
          end_date: resolvedEnd,
        }
      );

      if (rpcError) throw rpcError;

      // The RPC returns a jsonb (Json type), cast it safely
      const parsed: WorkloadData[] = Array.isArray(rpcData)
        ? (rpcData as WorkloadData[])
        : [];

      setData(parsed);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load workload data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resolvedStart, resolvedEnd]);

  useEffect(() => {
    fetchWorkload();
  }, [fetchWorkload]);

  return { data, loading, error, refetch: fetchWorkload };
}
