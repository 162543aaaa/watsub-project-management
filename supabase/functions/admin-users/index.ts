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
    const { action, email, password, display_name, user_id, role, is_approved, allowed_pages, teamContext, apiKey, selectedModel, features } = body;

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

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Gemini API error ${res.status}: ${errBody}`);
        }

        const json = await res.json();
        const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
        const parsed = JSON.parse(text);
        const recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendations ?? []);

        return new Response(JSON.stringify({ recommendations }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fallback: rule-based recommendations
      const recommendations = generateFallbackRecommendations(teamContext);
      return new Response(JSON.stringify({ recommendations }), {
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

    // 3. SAVE AI SETTINGS (admin only)
    // ─────────────────────────────────────────────────────────────────────────
    // This action persists the admin's BYOK Gemini API key plus model/feature
    // preferences.
    //
    // SUPABASE VAULT INTEGRATION GUIDE
    // To store the API key with true server-side encryption, follow these steps:
    //
    //   1. Enable the pgsodium / Vault extension in your Supabase project:
    //        SELECT vault.create_secret('<API_KEY>', 'gemini_api_key', 'Gemini BYOK key');
    //
    //   2. To upsert (replace) the secret later:
    //        SELECT vault.update_secret(id, '<NEW_API_KEY>')
    //        FROM vault.secrets WHERE name = 'gemini_api_key';
    //
    //   3. To read the decrypted secret in an edge function:
    //        const { data } = await supabase.rpc('vault_decrypt', { secret_name: 'gemini_api_key' });
    //        const key = data?.decrypted_secret;
    //
    //   4. You can also use a `ai_settings` table to persist model/feature prefs:
    //        CREATE TABLE ai_settings (
    //          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    //          model       text NOT NULL DEFAULT 'gemini-2.0-flash',
    //          features    jsonb NOT NULL DEFAULT '{}',
    //          updated_at  timestamptz DEFAULT now()
    //        );
    //        -- Then upsert a single row keyed on a fixed id or no PK conflict:
    //        INSERT INTO ai_settings (id, model, features)
    //        VALUES ('00000000-0000-0000-0000-000000000001', <model>, <features>)
    //        ON CONFLICT (id) DO UPDATE SET model = EXCLUDED.model, features = EXCLUDED.features, updated_at = now();
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'save-ai-settings') {
      // Validate input
      const validModels = ['gemini-2.0-flash', 'gemini-1.5-pro'];
      if (selectedModel && !validModels.includes(selectedModel)) {
        return new Response(JSON.stringify({ error: 'Invalid model selection' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If an API key was provided, persist it via Supabase Vault RPC.
      // The vault.create_secret / vault.update_secret functions are available
      // when the Vault extension is enabled on your Supabase project.
      if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
        // Check whether a secret named 'gemini_api_key' already exists.
        const { data: existingSecret } = await supabase
          .rpc('vault_secret_exists' as never, { secret_name: 'gemini_api_key' })
          .single()
          .catch(() => ({ data: null }));

        if (existingSecret) {
          // Update existing secret
          await supabase
            .rpc('vault_update_secret' as never, {
              secret_name: 'gemini_api_key',
              new_secret: apiKey.trim(),
            })
            .catch(() => {
              // If vault RPCs are not yet enabled, fall back to storing in an
              // environment-variable-style secrets table or log a warning.
              console.warn('[save-ai-settings] Vault update RPC not available — key not persisted.');
            });
        } else {
          // Create new secret
          await supabase
            .rpc('vault_create_secret' as never, {
              secret_name: 'gemini_api_key',
              secret_value: apiKey.trim(),
              description: 'Gemini BYOK API key for AI features',
            })
            .catch(() => {
              console.warn('[save-ai-settings] Vault create RPC not available — key not persisted.');
            });
        }
      }

      // Persist model + feature toggles to the ai_settings table (if it exists).
      // This is a best-effort upsert; missing table will not cause a hard error.
      if (selectedModel || features) {
        await supabase
          .from('ai_settings' as never)
          .upsert({
            id: '00000000-0000-0000-0000-000000000001',
            ...(selectedModel && { model: selectedModel }),
            ...(features && { features }),
            updated_at: new Date().toISOString(),
          })
          .catch(() => {
            // Table may not exist yet — silently skip. Create it with the SQL
            // in the guide above to enable persistence.
            console.warn('[save-ai-settings] ai_settings table not found — preferences not persisted.');
          });
      }

      return new Response(JSON.stringify({ success: true }), {
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
