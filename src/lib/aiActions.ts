import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// AI ACTION ORCHESTRATOR (อัปเกรดใช้ Supabase Invoke แก้ปัญหา Invalid JWT)
// ============================================================================
async function callAiAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // 1. ดึง Key ของ Gemini ที่ซ่อนไว้ (ถ้ามี)
  const geminiApiKey = sessionStorage.getItem("ai_key_gemini") ?? undefined;

  // 2. ใช้ .invoke() แทน fetch() เพื่อให้ระบบจัดการ JWT Token และ Header อัตโนมัติ!
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, geminiApiKey, ...payload },
  });

  // 3. จัดการ Error แบบละเอียด
  if (error) {
    // ถ้าเป็น Error จาก JWT/Auth หรือเครือข่าย
    console.error(`Invoke Error for ${action}:`, error);
    throw new Error(`การเชื่อมต่อ AI ล้มเหลว (${action}): ${error.message}`);
  }

  if (data?.error) {
    // ถ้าเป็น Error ที่ฟ้องมาจาก Edge Function ของเราเอง
    throw new Error(`ข้อผิดพลาดจาก AI: ${data.error}`);
  }

  return data || {};
}

// ============================================================================
// AI FUNCTIONS
// ============================================================================

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
