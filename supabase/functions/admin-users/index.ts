import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // 3. GLOBAL AI CHATBOT — real context injection + vault key resolution
    // ========================================================================
    if (action === 'chat-with-data') {
      const callerId = claimsData.user.id;
      // deno-lint-ignore no-explicit-any
      const messages: Array<{ role: string; content: string }> = body.messages ?? [];

      // ── 3a. Inject real user context from DB ─────────────────────────────
      const [tasksResult, projectsResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, name, status, due_date, priority')
          .contains('assigned_to', [callerId])
          .limit(20),
        supabase
          .from('projects')
          .select('id, name, status')
          .limit(10),
      ]);

      const userContext = {
        myTasks: tasksResult.data ?? [],
        projects: projectsResult.data ?? [],
      };

      // ── 3b. Resolve API keys: body → Vault → env var ─────────────────────
      let geminiKey: string | undefined = body.geminiApiKey || undefined;
      let claudeKey: string | undefined = body.claudeApiKey || undefined;

      if (!geminiKey) {
        try {
          const { data } = await supabase.rpc('get_decrypted_secret', { secret_name: 'ai_key_gemini' });
          if (data) geminiKey = data;
        } catch { /* Vault not set up */ }
      }
      if (!geminiKey) geminiKey = Deno.env.get('GEMINI_API_KEY') || undefined;

      if (!claudeKey) {
        try {
          const { data } = await supabase.rpc('get_decrypted_secret', { secret_name: 'ai_key_claude' });
          if (data) claudeKey = data;
        } catch { /* Vault not set up */ }
      }

      // ── 3c. Resolve preferred model: body → ai_settings table → default ──
      let geminiModel: string = body.geminiModel || '';
      let claudeModel: string = body.claudeModel || '';

      if (!geminiModel || !claudeModel) {
        try {
          const { data: settings } = await supabase
            .from('ai_settings')
            .select('provider, model')
            .eq('id', 1)
            .single();
          if (settings) {
            if (!geminiModel && settings.provider === 'gemini') geminiModel = settings.model;
            if (!claudeModel && settings.provider === 'claude') claudeModel = settings.model;
          }
        } catch { /* table not ready */ }
      }
      geminiModel = geminiModel || 'gemini-2.0-flash';
      claudeModel = claudeModel || 'claude-sonnet-4-6';

      const systemPrompt = `You are Watsub AI, a helpful project management assistant embedded in the WatSUB Project Management application.
You help team members understand their tasks, projects, deadlines, and workload.
Be concise, friendly, and professional. Respond in the same language the user writes in (Thai or English).

Current user's workspace data:
${JSON.stringify(userContext, null, 2)}`;

      // ── 3d. Try Gemini ────────────────────────────────────────────────────
      if (geminiKey && messages.length > 0) {
        try {
          const contents = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents }) },
          );

          if (res.ok) {
            const json = await res.json();
            const reply: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'ขออภัย ไม่สามารถตอบได้ในขณะนี้ครับ';
            return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch { /* fall through to Claude */ }
      }

      // ── 3e. Try Claude ────────────────────────────────────────────────────
      if (claudeKey && messages.length > 0) {
        try {
          const claudeMessages = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content }));

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: claudeModel, max_tokens: 1024, system: systemPrompt, messages: claudeMessages }),
          });

          if (res.ok) {
            const json = await res.json();
            const reply: string = json.content?.[0]?.text ?? 'ขออภัย ไม่สามารถตอบได้ในขณะนี้ครับ';
            return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch { /* fall through */ }
      }

      // No key available
      return new Response(JSON.stringify({
        reply: 'กรุณาตั้งค่า API Key ก่อนครับ\n\nไปที่ไอคอน 🤖 (AI Settings) ที่มุมขวาบน → กรอก Gemini หรือ Claude API Key → กด "Save Key" แล้วลองใหม่อีกครั้งครับ',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
