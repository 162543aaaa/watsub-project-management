import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// AI EMBEDDING HELPER (แปลงข้อความเป็น Vector 768 มิติ)
// ============================================================================
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      },
    );
    if (!res.ok) {
      console.error('Embedding API Error:', await res.text());
      return null;
    }
    const json = await res.json();
    return json.embedding?.values || null;
  } catch (err) {
    console.error('Embedding Exception:', err);
    return null;
  }
}

// ============================================================================
// SHARED AI HELPERS (Gemini key resolution + single-turn chat)
// ============================================================================

// deno-lint-ignore no-explicit-any
async function resolveGeminiKey(body: Record<string, any>, supabaseClient: any): Promise<string | undefined> {
  let key: string | undefined = body.geminiApiKey;
  if (!key) {
    try {
      const { data } = await supabaseClient.rpc('get_decrypted_secret', { secret_name: 'ai_key_gemini' });
      if (data) key = data;
    } catch { /* ignored */ }
  }
  return key || Deno.env.get('GEMINI_API_KEY');
}

async function callGemini(apiKey: string, prompt: string, jsonMode = false): Promise<string | null> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };
  if (jsonMode) body.generationConfig = { response_mime_type: 'application/json' };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (!res.ok) {
    console.error(`Gemini error ${res.status}:`, await res.text());
    return null;
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ============================================================================
// AI SYSTEM CONFIGURATION & HELPERS
// ============================================================================
const SYSTEM_PROMPT = `You are an expert Scrum Master and Project Manager. Analyze the provided team workload and task deadlines.

CRITICAL RULES:
1. When checking workload limits, look ONLY at the 'inProgressCount' field.
2. IGNORE tasks with status 'To Do' when calculating if an employee is overloaded.
3. No employee should have more than 5 'In Progress' tasks.
4. If an employee has > 5 'In Progress' tasks, suggest reassigning one of their 'In Progress' tasks to someone with a lower 'inProgressCount'.

Return ONLY a JSON array of recommendations matching the AIRecommendation interface.
Each recommendation must be a JSON object with these exact fields:
{
  "id": "unique-string",
  "type": "risk_alert" | "reassign_task" | "timeline_adjustment",
  "description": "Short, human-readable summary of the recommendation",
  "reasoning": "Detailed explanation of why this recommendation is made",
  "suggested_action": {
    "taskId"?: "uuid of the task to act on",
    "newAssigneeId"?: "uuid of the employee to reassign to",
    "newDeadline"?: "YYYY-MM-DD",
    "affectedEmployeeId"?: "uuid of the overloaded employee"
  },
  "status": "pending"
}`;

interface WorkloadEntry {
  employeeId: string;
  employeeName: string;
  inProgressCount: number;
  todoCount: number;
  tasks: Array<{ id: string; name: string; status: string }>;
}

interface OverdueEntry {
  id: string;
  name: string;
  dueDate: string;
  assignees: string[];
  daysOverdue: number;
}

// deno-lint-ignore no-explicit-any
function generateFallbackRecommendations(ctx: Record<string, any>) {
  // deno-lint-ignore no-explicit-any
  const recommendations: any[] = [];
  let index = 0;

  const workloads: WorkloadEntry[] = ctx.workloads ?? [];
  const overdue: OverdueEntry[] = ctx.overdueTasks ?? [];

  for (const w of workloads) {
    if (w.inProgressCount > 5) {
      recommendations.push({
        id: `rec-${++index}`,
        type: "risk_alert",
        description: `${w.employeeName} has ${w.inProgressCount} In Progress tasks — exceeds the 5-task limit.`,
        reasoning: `Rule: No employee should have more than 5 "In Progress" tasks. ${w.employeeName} currently has ${w.inProgressCount}, creating a bottleneck risk.`,
        suggested_action: { affectedEmployeeId: w.employeeId },
        status: "pending",
      });

      const underloaded = workloads.find(
        (u) => u.inProgressCount < 3 && u.employeeId !== w.employeeId,
      );
      if (underloaded) {
        const taskToMove = w.tasks.find((t) => t.status === "In Progress");
        if (taskToMove) {
          recommendations.push({
            id: `rec-${++index}`,
            type: "reassign_task",
            description: `Reassign "${taskToMove.name}" from ${w.employeeName} to ${underloaded.employeeName}.`,
            reasoning: `${w.employeeName} is overloaded. ${underloaded.employeeName} has capacity.`,
            suggested_action: { taskId: taskToMove.id, newAssigneeId: underloaded.employeeId },
            status: "pending",
          });
        }
      }
    }
  }

  for (const t of overdue.slice(0, 3)) {
    const newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    recommendations.push({
      id: `rec-${++index}`,
      type: "timeline_adjustment",
      description: `Task "${t.name}" is ${t.daysOverdue} day(s) overdue.`,
      reasoning: `Original deadline was ${t.dueDate}. Assignees: ${t.assignees.join(", ")}. Consider rescheduling.`,
      suggested_action: { taskId: t.id, newDeadline },
      status: "pending",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "rec-1",
      type: "risk_alert",
      description: "Team health looks good — no immediate issues detected.",
      reasoning: "All employees are within limits.",
      suggested_action: {},
      status: "pending",
    });
  }

  return recommendations;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // deno-lint-ignore no-explicit-any
    const body = await req.json().catch(() => ({})) as Record<string, any>;
    const { action, email, password, display_name, user_id, role, is_approved, allowed_pages, teamContext } = body;

    // 1. SETUP ADMIN (No Auth required — initial setup only)
    if (action === 'setup-admin') {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: display_name || 'ADMIN' },
      });
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = authData.user.id;
      await supabase.from('profiles').update({ is_approved: true, display_name: display_name || 'ADMIN' }).eq('user_id', userId);
      await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' });

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- MUST BE AUTHENTICATED BEYOND THIS POINT ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. AI PROJECT MANAGER ACTION (any authenticated user)
    if (action === 'run-ai') {
      if (!teamContext) {
        return new Response(JSON.stringify({ error: 'Missing teamContext' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const geminiKey = Deno.env.get('GEMINI_API_KEY');
      if (geminiKey) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ role: 'user', parts: [{ text: JSON.stringify(teamContext, null, 2) }] }],
                generationConfig: { response_mime_type: 'application/json' },
              }),
            },
          );

          if (res.ok) {
            const json = await res.json();
            const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
            const parsed = JSON.parse(text);
            const recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendations ?? []);
            return new Response(JSON.stringify({ recommendations }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          // Gemini API returned non-2xx — fall through to rule-based fallback
        } catch {
          // Network or parse error — fall through to rule-based fallback
        }
      }

      // Fallback: rule-based recommendations
      const recommendations = generateFallbackRecommendations(teamContext);
      return new Response(JSON.stringify({ recommendations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // NEW: ACTION สำหรับสร้าง Vector เมื่อมีการบันทึก Task/Project ใหม่
    // ========================================================================
    if (action === 'generate-embedding') {
      const { id, text, table } = body; // table = 'tasks' หรือ 'projects'

      // ดึง Key ออกมาจาก Vault ก่อน ถ้าไม่มีค่อยใช้ env var
      let geminiKey = Deno.env.get('GEMINI_API_KEY');
      try {
        const { data: vaultKey } = await supabase.rpc('get_decrypted_secret', { secret_name: 'ai_key_gemini' });
        if (vaultKey) geminiKey = vaultKey;
      } catch { /* ignored */ }

      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'No API Key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const vector = await generateEmbedding(text, geminiKey);
      if (vector) {
        // อัปเดตข้อมูลตัวเลขลงในฐานข้อมูล
        await supabase.from(table).update({ embedding: vector }).eq('id', id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to generate embedding' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // PHASE-1 AI QUICK WINS — polish-text / breakdown-task / draft-kpi
    // All require auth; no admin privilege needed.
    // ========================================================================

    if (action === 'polish-text') {
      const { rawText } = body;
      if (!rawText?.trim()) {
        return new Response(JSON.stringify({ error: 'Missing rawText' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const geminiKey = await resolveGeminiKey(body, supabase);
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'No Gemini API Key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const prompt = `Rewrite the following text in a professional, clear, and structured business tone. ` +
        `Return ONLY the rewritten text — no explanations, no markdown, no extra commentary.\n\nOriginal:\n${rawText}`;
      const polished = await callGemini(geminiKey, prompt);
      return new Response(JSON.stringify({ polished: polished ?? rawText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'breakdown-task') {
      const { taskTitle } = body;
      if (!taskTitle?.trim()) {
        return new Response(JSON.stringify({ error: 'Missing taskTitle' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const geminiKey = await resolveGeminiKey(body, supabase);
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'No Gemini API Key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const prompt = `Break the following task into exactly 5 to 7 clear, actionable sub-task names. ` +
        `Return ONLY a JSON array of strings. No explanation, no markdown, just the raw JSON array.\n\nTask: "${taskTitle}"`;
      const raw = await callGemini(geminiKey, prompt, true);
      let subTasks: string[] = [];
      try {
        const parsed = JSON.parse(raw ?? '[]');
        subTasks = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch { subTasks = []; }
      return new Response(JSON.stringify({ subTasks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'draft-kpi') {
      const { stats, employeeName } = body;
      if (!stats || !employeeName) {
        return new Response(JSON.stringify({ error: 'Missing stats or employeeName' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const geminiKey = await resolveGeminiKey(body, supabase);
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'No Gemini API Key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const prompt = `คุณคือ HR Manager มืออาชีพ กรุณาเขียนบทสรุปผลการปฏิบัติงานสำหรับพนักงานชื่อ "${employeeName}" ` +
        `โดยอิงจากข้อมูลสถิติต่อไปนี้:\n\n${JSON.stringify(stats, null, 2)}\n\n` +
        `เขียนเป็นภาษาไทย กระชับ เป็นมืออาชีพ ไม่ต้องขึ้นหัวข้อ ความยาวประมาณ 3-4 ประโยค ` +
        `ระบุจุดแข็งและข้อแนะนำในการพัฒนา`;
      const draft = await callGemini(geminiKey, prompt);
      return new Response(JSON.stringify({ draft: draft ?? '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // PHASE-2 AI SMART LOGIC — customer-sentiment / okr-suggestions
    // ========================================================================

    if (action === 'customer-sentiment') {
      const { customerData } = body;
      if (!customerData) {
        return new Response(JSON.stringify({ error: 'Missing customerData' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const geminiKey = await resolveGeminiKey(body, supabase);
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'No Gemini API Key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const info = [
        customerData.note && `Notes: ${customerData.note}`,
        customerData.detail && `Detail: ${customerData.detail}`,
        customerData.job_description && `Job Description: ${customerData.job_description}`,
        customerData.feedback_channel && `Feedback Channel: ${customerData.feedback_channel}`,
      ].filter(Boolean).join('\n');
      const prompt = `You are a Customer Success Manager. Analyze this customer profile for "${customerData.name}" and determine their sentiment based on the available information.\n\n${info || '(No notes available)'}\n\nReturn ONLY valid JSON with no markdown: {"sentiment": "Happy", "reason": "one sentence"}\nsentiment must be exactly one of: "Happy", "Neutral", "At Risk"`;
      const raw = await callGemini(geminiKey, prompt, true);
      let result: { sentiment: string; reason: string } = { sentiment: 'Neutral', reason: 'Insufficient data to determine sentiment.' };
      try {
        const parsed = JSON.parse(raw ?? '{}');
        if (parsed.sentiment && parsed.reason) result = parsed;
      } catch { /* use default */ }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'okr-suggestions') {
      const { okrData } = body;
      if (!okrData) {
        return new Response(JSON.stringify({ error: 'Missing okrData' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const geminiKey = await resolveGeminiKey(body, supabase);
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: 'No Gemini API Key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const prompt = `You are an OKR Coach. This objective is at risk of not being completed on time.\n\n` +
        `Objective: "${okrData.title}"\nPeriod: ${okrData.period}\n` +
        `Current Progress: ${okrData.progressPct}%\nDays Elapsed: ${okrData.daysElapsed} of ${okrData.totalDays}\n\n` +
        `Suggest exactly 2 specific, actionable steps to accelerate progress and hit 100% by the deadline. ` +
        `Return ONLY valid JSON with no markdown: {"suggestions": ["step 1", "step 2"]}`;
      const raw = await callGemini(geminiKey, prompt, true);
      let suggestions: string[] = [];
      try {
        const parsed = JSON.parse(raw ?? '{}');
        suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [];
      } catch { suggestions = []; }
      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // 4. GET AI SETTINGS — return saved model/features + vault key flags
    // ========================================================================
    if (action === 'get-ai-settings') {
      // deno-lint-ignore no-explicit-any
      let settingsData: Record<string, any> = { provider: 'gemini', model: 'gemini-2.0-flash', features: {} };
      try {
        const { data } = await supabase
          .from('ai_settings')
          .select('provider, model, features')
          .eq('id', 1)
          .single();
        if (data) settingsData = data;
      } catch { /* table not ready */ }

      let geminiKeySet = false;
      let claudeKeySet = false;
      try {
        const { data } = await supabase.rpc('get_decrypted_secret', { secret_name: 'ai_key_gemini' });
        geminiKeySet = !!data;
      } catch { /* vault not set up */ }
      try {
        const { data } = await supabase.rpc('get_decrypted_secret', { secret_name: 'ai_key_claude' });
        claudeKeySet = !!data;
      } catch { /* vault not set up */ }

      return new Response(JSON.stringify({ ...settingsData, geminiKeySet, claudeKeySet }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // 5. SAVE AI SETTINGS (BYOK) — Vault encryption + ai_settings table
    // ========================================================================
    if (action === 'save-ai-settings') {
      const { provider, apiKey, selectedModel, features } = body;

      // Save API key to Vault (encrypted)
      if (provider && apiKey) {
        try {
          await supabase.rpc('put_decrypted_secret', {
            secret_name: `ai_key_${provider}`,
            secret_value: apiKey,
          });
        } catch { /* Vault not available — key only in sessionStorage */ }
      }

      // Upsert model/feature preferences into ai_settings table
      try {
        await supabase.from('ai_settings').upsert({
          id: 1,
          provider: provider ?? 'gemini',
          model: selectedModel ?? 'gemini-2.0-flash',
          features: features ?? {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch { /* table not ready */ }

      return new Response(JSON.stringify({
        success: true,
        message: 'AI settings saved.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- MUST BE ADMIN BEYOND THIS POINT ---
    const callerId = claimsData.user.id;
    const { data: callerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .single();
    if (!callerRole) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. ADMIN USER MANAGEMENT ACTIONS
    if (action === 'approve-user') {
      await supabase.from('profiles').update({ is_approved }).eq('user_id', user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set-role') {
      if (role === 'admin') {
        await supabase.from('user_roles').upsert({ user_id, role: 'admin' });
      } else {
        await supabase.from('user_roles').delete().eq('user_id', user_id).eq('role', 'admin');
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set-pages') {
      await supabase.from('profiles').update({ allowed_pages }).eq('user_id', user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list-users') {
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at');
      const { data: roles } = await supabase.from('user_roles').select('*');
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

      const emailMap: Record<string, string> = {};
      // deno-lint-ignore no-explicit-any
      authUsers?.forEach((u: any) => { emailMap[u.id] = u.email || ''; });

      // deno-lint-ignore no-explicit-any
      const result = (profiles || []).map((p: any) => ({
        profile: p,
        // deno-lint-ignore no-explicit-any
        roles: (roles || []).filter((r: any) => r.user_id === p.user_id),
        email: emailMap[p.user_id] || p.display_name,
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
