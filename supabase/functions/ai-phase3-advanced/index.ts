// ai-phase3-advanced — Deno Edge Function
// Handles two Phase 3 AI actions:
//   1. onboard-project  → RAG-powered Welcome Briefing for new team members
//   2. text-to-chart    → Natural-language query → recharts-ready JSON
//
// Required secrets (Supabase Dashboard → Edge Functions → Manage secrets):
//   GEMINI_API_KEY          — Google Generative AI key (Gemini 2.0 Flash)
//   SUPABASE_URL            — auto-provided
//   SUPABASE_SERVICE_ROLE_KEY — auto-provided

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Call Gemini with JSON response_mime_type. Returns the parsed object or
 *  throws on HTTP error. */
async function callGemini(
  systemPrompt: string,
  userContent: string,
): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: { response_mime_type: "application/json" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  const raw: string =
    json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  // Defensive: Gemini occasionally wraps JSON in ```json … ``` fences even
  // when response_mime_type is set to application/json.
  const cleanRaw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleanRaw || "{}");
}

/** Generate a 768-dim text embedding via Gemini text-embedding-004. */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_KEY) return new Array(768).fill(0);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return (json.embedding?.values as number[]) ?? [];
}

// ---------------------------------------------------------------------------
// Action: onboard-project
// ---------------------------------------------------------------------------

interface ProjectTask {
  id: string;
  name: string;
  status: string;
  priority: string;
  assigned_to: string[];
  due_date: string | null;
  comments: string | null;
}

interface MeetingNote {
  id: string;
  name: string;
  comments: string | null;
  due_date: string | null;
}

interface MatchedTask {
  id: string;
  name: string;
  status: string;
  priority: string;
  due_date: string | null;
  comments: string | null;
  similarity: number;
}

async function handleOnboardProject(body: Record<string, unknown>): Promise<Response> {
  const projectName = typeof body.projectName === "string" ? body.projectName : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : null;

  if (!projectName) {
    return json({ error: "Missing projectName" }, 400);
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const today = new Date().toISOString().split("T")[0];

  // Step 1: Fetch tasks that directly belong to this project
  const { data: projectTasks } = await db
    .from("tasks")
    .select("id, name, status, priority, assigned_to, due_date, comments")
    .eq("project_id", projectId ?? "")
    .order("status")
    .limit(30);

  // Step 2: Semantic search — find historically similar tasks using pgvector
  let semanticMatches: MatchedTask[] = [];
  const embedding = await generateEmbedding(projectName);
  const hasEmbedding = embedding.some((v) => v !== 0);
  if (hasEmbedding) {
    const { data: matchData } = await db.rpc("match_tasks_global", {
      query_embedding: embedding,
      match_threshold: 0.35,
      match_count: 8,
    });
    if (matchData) {
      // Exclude tasks that already belong to this project
      const projectTaskIds = new Set((projectTasks ?? []).map((t: ProjectTask) => t.id));
      semanticMatches = (matchData as MatchedTask[]).filter(
        (t) => !projectTaskIds.has(t.id),
      );
    }
  }

  // Step 3: Fetch recent meeting notes for broader context
  const { data: meetingNotes } = await db
    .from("tasks")
    .select("id, name, comments, due_date")
    .eq("category", "meeting")
    .order("due_date", { ascending: false })
    .limit(5);

  const tasks = (projectTasks ?? []) as ProjectTask[];
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress").length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== "Done" && t.due_date && t.due_date < today,
  );
  const completionRate = totalTasks
    ? Math.round((doneTasks / totalTasks) * 100)
    : 0;

  // Step 4: Generate briefing with LLM or deterministic fallback
  let briefing: string;

  if (GEMINI_KEY) {
    const systemPrompt = `You are an expert project onboarding assistant for a creative agency.
Given structured project context, generate a concise "Welcome Briefing" for a new team member joining this project.

The briefing MUST use this exact markdown structure:
## 👋 Welcome to {projectName}!

### 📌 Project Overview
(2–3 sentences describing what the project is about, inferred from its tasks)

### 📊 Current Status
(Completion rate, task breakdown, overall health in 2–3 bullet points)

### 🔍 Key Historical Context
(Up to 3 bullet points from semantically similar past tasks, if any)

### ⚠️ Current Bottlenecks
(List overdue tasks or tasks at risk; if none, say "No blockers 🎉")

### ✅ Your Next Steps
(3–5 actionable bullet points for the new team member)

Return ONLY a JSON object: { "briefing": "<full markdown string>" }`;

    const context = {
      projectName,
      stats: { totalTasks, doneTasks, inProgressTasks, completionRate },
      overdueTasks: overdueTasks.map((t) => ({
        name: t.name,
        daysOverdue: Math.floor(
          (Date.now() - new Date(t.due_date!).getTime()) / 86400000,
        ),
        assignedTo: t.assigned_to,
      })),
      currentTasks: tasks.slice(0, 15).map((t) => ({
        name: t.name,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assigned_to,
        dueDate: t.due_date,
      })),
      historicalContext: semanticMatches.slice(0, 4).map((t) => ({
        name: t.name,
        status: t.status,
        similarity: Math.round(t.similarity * 100) + "%",
        notes: t.comments,
      })),
      recentMeetings: ((meetingNotes ?? []) as MeetingNote[]).slice(0, 3).map(
        (m) => ({ title: m.name, notes: m.comments, date: m.due_date }),
      ),
    };

    const result = await callGemini(systemPrompt, JSON.stringify(context, null, 2));
    briefing =
      typeof result === "object" &&
      result !== null &&
      "briefing" in result &&
      typeof (result as Record<string, unknown>).briefing === "string"
        ? (result as { briefing: string }).briefing
        : buildFallbackBriefing(projectName, tasks, overdueTasks, today);
  } else {
    briefing = buildFallbackBriefing(projectName, tasks, overdueTasks, today);
  }

  return json({ briefing });
}

function buildFallbackBriefing(
  projectName: string,
  tasks: ProjectTask[],
  overdueTasks: ProjectTask[],
  _today: string,
): string {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Done").length;
  const inProg = tasks.filter((t) => t.status === "In Progress").length;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const assignees = [...new Set(tasks.flatMap((t) => t.assigned_to))].filter(Boolean);

  return [
    `## 👋 Welcome to ${projectName}!`,
    "",
    "### 📌 Project Overview",
    `This project has **${total} task${total !== 1 ? "s" : ""}** managed across the team.` +
      (assignees.length
        ? ` Current contributors: ${assignees.slice(0, 5).join(", ")}.`
        : ""),
    "",
    "### 📊 Current Status",
    `- Completion rate: **${rate}%** (${done}/${total} tasks done)`,
    `- Currently in progress: **${inProg} task${inProg !== 1 ? "s" : ""}**`,
    rate >= 80
      ? "- Health: 🟢 On track"
      : rate >= 50
      ? "- Health: 🟡 Making progress"
      : "- Health: 🔴 Needs attention",
    "",
    "### ⚠️ Current Bottlenecks",
    overdueTasks.length > 0
      ? overdueTasks
          .slice(0, 3)
          .map(
            (t) =>
              `- **${t.name}** — overdue by ${Math.floor((Date.now() - new Date(t.due_date!).getTime()) / 86400000)} day(s)`,
          )
          .join("\n")
      : "No overdue tasks — the project is on schedule! 🎉",
    "",
    "### ✅ Your Next Steps",
    "- Review all **In Progress** tasks and check if any are blocked",
    "- Connect with teammates assigned to high-priority items",
    "- Check for any dependencies between tasks before picking up new work",
    "- Review any meeting notes for context on recent decisions",
    "- Add your first task and get started! 🚀",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Strict TypeScript types for recharts chart spec
// ---------------------------------------------------------------------------

interface BarLineDef {
  dataKey: string;
  color: string;
  name: string;
}

interface BaseChartSpec {
  title: string;
  data: Record<string, string | number>[];
}

interface BarChartSpec extends BaseChartSpec {
  type: "BarChart";
  xKey: string;
  bars: BarLineDef[];
}

interface LineChartSpec extends BaseChartSpec {
  type: "LineChart";
  xKey: string;
  lines: BarLineDef[];
}

interface AreaChartSpec extends BaseChartSpec {
  type: "AreaChart";
  xKey: string;
  bars?: BarLineDef[];
  lines?: BarLineDef[];
}

interface PieChartSpec extends BaseChartSpec {
  type: "PieChart";
  nameKey: string;
  valueKey: string;
  colors: string[];
}

type ChartSpec = BarChartSpec | LineChartSpec | AreaChartSpec | PieChartSpec;

interface ChartResponse {
  chartSpec: ChartSpec;
  insight: string;
}

const VALID_CHART_TYPES = new Set(["BarChart", "LineChart", "AreaChart", "PieChart"]);

function isValidChartSpec(obj: unknown): obj is ChartSpec {
  if (!obj || typeof obj !== "object") return false;
  const spec = obj as Record<string, unknown>;
  if (!VALID_CHART_TYPES.has(spec.type as string)) return false;
  if (!Array.isArray(spec.data) || spec.data.length === 0) return false;
  if (typeof spec.title !== "string") return false;
  return true;
}

// ---------------------------------------------------------------------------
// Action: text-to-chart
// ---------------------------------------------------------------------------

async function handleTextToChart(body: Record<string, unknown>): Promise<Response> {
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const dataContext = body.dataContext ?? {};

  if (!query) {
    return json({ error: "Missing query" }, 400);
  }

  // Deterministic fallback when no LLM key is configured
  if (!GEMINI_KEY) {
    const fallback = buildFallbackChart(dataContext as Record<string, unknown>);
    return json(fallback);
  }

  const systemPrompt = `You are a data analyst that converts natural language queries into recharts-compatible JSON visualizations.

Given task/project management data and a user's query, analyze the intent and return a structured chart specification.

RULES:
1. Choose the BEST chart type for the question:
   - BarChart: comparisons between categories (e.g. tasks per person)
   - LineChart: trends over time (e.g. completions per month)
   - PieChart: proportions/distributions (e.g. task status breakdown)
   - AreaChart: cumulative trends
2. Keep data arrays concise (max 12 entries)
3. Use readable axis labels and chart titles
4. Choose visually distinct hex colors for each series
5. The "insight" field must be 1–2 sentences summarizing the key finding

Return ONLY a JSON object matching this EXACT schema:
{
  "chartSpec": {
    "type": "BarChart" | "LineChart" | "PieChart" | "AreaChart",
    "title": "string",
    "xKey": "string (field name for x-axis, omit for PieChart)",
    "bars": [{ "dataKey": "string", "color": "#hex", "name": "string" }],
    "lines": [{ "dataKey": "string", "color": "#hex", "name": "string" }],
    "nameKey": "string (PieChart segment name field)",
    "valueKey": "string (PieChart value field)",
    "colors": ["#hex", ...],
    "data": [{ "fieldName": value, ... }]
  },
  "insight": "string"
}

Include only the fields relevant to the chosen chart type.`;

  const userContent = `Query: "${query}"

Available Data:
${JSON.stringify(dataContext, null, 2)}`;

  let rawResult: unknown;
  try {
    rawResult = await callGemini(systemPrompt, userContent);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "LLM call failed" },
      502,
    );
  }

  // Strict validation of the chart spec
  const result = rawResult as Record<string, unknown>;
  if (!isValidChartSpec(result?.chartSpec)) {
    // Fallback to deterministic chart rather than returning an error
    const fallback = buildFallbackChart(dataContext as Record<string, unknown>);
    return json({ ...fallback, insight: "Could not parse AI response — showing default chart." });
  }

  const chartResponse: ChartResponse = {
    chartSpec: result.chartSpec as ChartSpec,
    insight: typeof result.insight === "string" ? result.insight : "",
  };

  return json(chartResponse);
}

function buildFallbackChart(
  ctx: Record<string, unknown>,
): ChartResponse {
  // Build a simple employee task-completion bar chart from the context
  type EmpEntry = { name: string; done?: number; inProgress?: number; total?: number };
  const employees = Array.isArray(ctx.employees)
    ? (ctx.employees as EmpEntry[]).slice(0, 8)
    : [];

  if (employees.length > 0) {
    return {
      chartSpec: {
        type: "BarChart",
        title: "Task Completion by Employee",
        xKey: "name",
        bars: [
          { dataKey: "done", color: "#22c55e", name: "Completed" },
          { dataKey: "inProgress", color: "#06b6d4", name: "In Progress" },
        ],
        data: employees.map((e) => ({
          name: e.name,
          done: e.done ?? 0,
          inProgress: e.inProgress ?? 0,
        })),
      },
      insight:
        "Set GEMINI_API_KEY to enable AI-powered chart generation from natural language queries.",
    };
  }

  // Generic status distribution fallback
  const statuses = ctx.taskStatusCounts as Record<string, number> | undefined;
  return {
    chartSpec: {
      type: "PieChart",
      title: "Task Status Distribution",
      nameKey: "status",
      valueKey: "count",
      colors: ["#22c55e", "#06b6d4", "#94a3b8"],
      data: [
        { status: "Done", count: statuses?.Done ?? 0 },
        { status: "In Progress", count: statuses?.["In Progress"] ?? 0 },
        { status: "To Do", count: statuses?.["To Do"] ?? 0 },
      ].filter((d) => (d.count as number) > 0),
    },
    insight:
      "Set GEMINI_API_KEY to enable AI-powered chart generation from natural language queries.",
  };
}

// ---------------------------------------------------------------------------
// Utility: typed JSON response
// ---------------------------------------------------------------------------
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;

    if (action === "onboard-project") return handleOnboardProject(body);
    if (action === "text-to-chart") return handleTextToChart(body);

    return json({ error: `Unknown action: "${action}". Use "onboard-project" or "text-to-chart".` }, 400);
  } catch (err: unknown) {
    return json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      500,
    );
  }
});
