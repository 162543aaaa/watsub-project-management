import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
// ---------------------------------------------------------------------------
// Deterministic fallback generator — used when no LLM key is configured
// ---------------------------------------------------------------------------
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

  // Overloaded employees
  for (const w of workloads) {
    if (w.inProgressCount > 5) {
      recommendations.push({
        id: `rec-${++index}`,
        type: "risk_alert",
        description: `${w.employeeName} has ${w.inProgressCount} In Progress tasks — exceeds the 5-task limit.`,
        reasoning: `Rule: No employee should have more than 5 "In Progress" tasks. ${w.employeeName} currently has ${w.inProgressCount}, creating a bottleneck risk and potential quality degradation.`,
        suggested_action: { affectedEmployeeId: w.employeeId },
        status: "pending",
      });

      // Suggest a reassignment to a less-loaded teammate
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
            reasoning: `${w.employeeName} is overloaded (${w.inProgressCount} active tasks). ${underloaded.employeeName} has capacity with only ${underloaded.inProgressCount} active tasks.`,
            suggested_action: {
              taskId: taskToMove.id,
              newAssigneeId: underloaded.employeeId,
            },
            status: "pending",
          });
        }
      }
    }
  }

  // Overdue tasks — surface up to 3
  for (const t of overdue.slice(0, 3)) {
    const newDeadline = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];
    recommendations.push({
      id: `rec-${++index}`,
      type: "timeline_adjustment",
      description: `Task "${t.name}" is ${t.daysOverdue} day(s) overdue.`,
      reasoning: `Original deadline was ${t.dueDate}. Assignees: ${t.assignees.join(", ") || "unassigned"}. Consider rescheduling to ${newDeadline} or escalating.`,
      suggested_action: { taskId: t.id, newDeadline },
      status: "pending",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "rec-1",
      type: "risk_alert",
      description: "Team health looks good — no immediate issues detected.",
      reasoning:
        "All employees are within the 5-task In Progress limit and no tasks are critically overdue. Keep monitoring daily.",
      suggested_action: {},
      status: "pending",
    });
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Edge Function entry point
// ---------------------------------------------------------------------------
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const teamContext = body.teamContext;

    if (!teamContext) {
      return new Response(
        JSON.stringify({ error: "Missing teamContext in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // -------------------------------------------------------------------------
    // === Google Gemini (ACTIVE) ===
    // Set GEMINI_API_KEY in Supabase Dashboard → Edge Functions → Manage secrets
    // -------------------------------------------------------------------------
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      const geminiUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: JSON.stringify(teamContext, null, 2) }],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errBody}`);
      }

      const json = await res.json();
      const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const parsed = JSON.parse(text);
      const recommendations = Array.isArray(parsed)
        ? parsed
        : (parsed.recommendations ?? []);

      return new Response(JSON.stringify({ recommendations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------------------------------------------------------------------
    // Optional: Anthropic (Claude) — uncomment + set ANTHROPIC_API_KEY secret
    // -------------------------------------------------------------------------
    // const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    // if (anthropicKey) {
    //   const res = await fetch("https://api.anthropic.com/v1/messages", {
    //     method: "POST",
    //     headers: {
    //       "x-api-key": anthropicKey,
    //       "anthropic-version": "2023-06-01",
    //       "content-type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       model: "claude-sonnet-4-6",
    //       max_tokens: 2048,
    //       system: SYSTEM_PROMPT,
    //       messages: [{ role: "user", content: JSON.stringify(teamContext, null, 2) }],
    //     }),
    //   });
    //   if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    //   const json = await res.json();
    //   const text = json.content?.[0]?.text ?? "[]";
    //   const recommendations = JSON.parse(text);
    //   return new Response(JSON.stringify({ recommendations }), {
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    // -------------------------------------------------------------------------
    // Optional: OpenAI (GPT-4o) — uncomment + set OPENAI_API_KEY secret
    // -------------------------------------------------------------------------
    // const openaiKey = Deno.env.get("OPENAI_API_KEY");
    // if (openaiKey) {
    //   const res = await fetch("https://api.openai.com/v1/chat/completions", {
    //     method: "POST",
    //     headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       model: "gpt-4o",
    //       response_format: { type: "json_object" },
    //       messages: [
    //         { role: "system", content: SYSTEM_PROMPT },
    //         { role: "user", content: JSON.stringify(teamContext, null, 2) },
    //       ],
    //     }),
    //   });
    //   if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    //   const json = await res.json();
    //   const text = json.choices?.[0]?.message?.content ?? "[]";
    //   const parsed = JSON.parse(text);
    //   const recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendations ?? []);
    //   return new Response(JSON.stringify({ recommendations }), {
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    // -------------------------------------------------------------------------
    // Fallback: deterministic rule-based recommendations (no API key configured)
    // -------------------------------------------------------------------------
    const recommendations = generateFallbackRecommendations(teamContext);

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
