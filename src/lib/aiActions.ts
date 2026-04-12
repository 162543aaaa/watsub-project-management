import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callAiAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  const geminiApiKey = sessionStorage.getItem("ai_key_gemini") ?? undefined;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ action, geminiApiKey, ...payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI '${action}' failed ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** Rewrite raw text in a professional business tone. Returns polished string. */
export async function polishText(rawText: string): Promise<string> {
  const data = await callAiAction("polish-text", { rawText });
  return (data.polished as string) ?? rawText;
}

/** Break a task title into 5–7 actionable sub-task name strings. */
export async function breakdownTask(taskTitle: string): Promise<string[]> {
  const data = await callAiAction("breakdown-task", { taskTitle });
  return (data.subTasks as string[]) ?? [];
}

/** Generate a Thai-language KPI performance review paragraph from stats. */
export async function draftKpiText(
  stats: Record<string, string>,
  employeeName: string,
): Promise<string> {
  const data = await callAiAction("draft-kpi", { stats, employeeName });
  return (data.draft as string) ?? "";
}

/** Analyze customer sentiment from notes/feedback. Returns sentiment + 1-sentence reason. */
export async function analyzeCustomerSentiment(customerData: {
  name: string;
  note?: string;
  detail?: string;
  job_description?: string;
  feedback_channel?: string;
}): Promise<{ sentiment: "Happy" | "Neutral" | "At Risk"; reason: string }> {
  const data = await callAiAction("customer-sentiment", { customerData });
  return {
    sentiment: (data.sentiment as "Happy" | "Neutral" | "At Risk") ?? "Neutral",
    reason: (data.reason as string) ?? "",
  };
}

/** Get 2 actionable suggestions to accelerate an at-risk OKR. */
export async function getOkrSuggestions(okrData: {
  title: string;
  period: string;
  progressPct: number;
  daysElapsed: number;
  totalDays: number;
}): Promise<string[]> {
  const data = await callAiAction("okr-suggestions", { okrData });
  return (data.suggestions as string[]) ?? [];
}
