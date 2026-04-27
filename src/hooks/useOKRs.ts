import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";
import type { Objective, KeyResult } from "@/types";

const OKR_KEY = "okrs";

export function useOKRs(filterYear: number) {
  const qc = useQueryClient();

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: [OKR_KEY, filterYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objectives")
        .select("*, key_results(*)")
        .eq("year", filterYear)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Objective[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [OKR_KEY, filterYear] });

  const addObjective = useMutation({
    mutationFn: async (obj: Omit<Objective, "id" | "created_at" | "updated_at" | "key_results">) => {
      const { data, error } = await supabase.from("objectives").insert(obj).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void autoSyncToGoogleSheets("objectives", data);
      invalidate();
      toast({ title: "เพิ่ม Objective สำเร็จ!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addKeyResult = useMutation({
    mutationFn: async (kr: Omit<KeyResult, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("key_results").insert(kr).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void autoSyncToGoogleSheets("key_results", data);
      invalidate();
      toast({ title: "เพิ่ม Key Result สำเร็จ!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateKeyResult = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<KeyResult>) => {
      const { data, error } = await supabase.from("key_results").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: [OKR_KEY, filterYear] });
      const prev = qc.getQueryData<Objective[]>([OKR_KEY, filterYear]);
      qc.setQueryData<Objective[]>([OKR_KEY, filterYear], old =>
        (old ?? []).map(o => ({
          ...o,
          key_results: o.key_results?.map(kr => kr.id === vars.id ? { ...kr, ...vars } : kr),
        }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData([OKR_KEY, filterYear], ctx.prev);
      toast({ title: "Error", description: "อัปเดตไม่สำเร็จ", variant: "destructive" });
    },
    onSuccess: (data) => {
      void autoSyncToGoogleSheets("key_results", data);
    },
    onSettled: () => invalidate(),
  });

  const updateObjective = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Objective>) => {
      const { data, error } = await supabase.from("objectives").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void autoSyncToGoogleSheets("objectives", data);
      invalidate();
      toast({ title: "อัปเดต Objective สำเร็จ!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteObjective = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("objectives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "ลบ Objective สำเร็จ!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteKeyResult = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("key_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "ลบ Key Result สำเร็จ!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Helper: compute objective progress from its KRs (no cap)
  const getProgress = (obj: Objective) => {
    const krs = obj.key_results ?? [];
    if (krs.length === 0) return 0;
    const total = krs.reduce((sum, kr) => {
      const range = kr.target_value - kr.initial_value;
      if (range <= 0) return sum + 100;
      return sum + ((kr.current_value - kr.initial_value) / range) * 100;
    }, 0);
    return Math.round(total / krs.length);
  };

  return {
    objectives,
    isLoading,
    addObjective,
    addKeyResult,
    updateKeyResult,
    updateObjective,
    deleteObjective,
    deleteKeyResult,
    getProgress,
  };
}
