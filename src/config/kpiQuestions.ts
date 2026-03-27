import type { KpiCategoryKey, KpiSubScoreKey } from "@/hooks/useKpi";

export type RoleKey = "ta" | "hafeez" | "sumayna" | "default";
export type ReviewerType = "self" | "peer" | "supervisor";
export type QuestionType = "auto" | "rate" | "text" | "hidden";

export type AutoValueId =
  | "tasks_ontime_pct"
  | "tasks_done_count"
  | "revision_avg"
  | "projects_closed"
  | "revenue_vs_target_q"
  | "scripts_ontime_pct"
  | "client_count"
  | "task_approve_d1";

export interface KPIQuestion {
  id: string;
  question: string;
  type: QuestionType;
  scoreKey?: KpiSubScoreKey;
  autoId?: AutoValueId;
  helperText?: string;
}

export interface KPISection {
  id: KpiCategoryKey | string;
  title: string;
  weight: string;
  color: string;
  questions: KPIQuestion[];
}

export interface KPIFormConfig {
  note: string;
  uiLabel?: string;
  sections: KPISection[];
}

export const ROLE_SECTION_WEIGHTS: Record<RoleKey, Record<string, number>> = {
  ta: { job_performance: 0.2, competency: 0.2, teamwork: 0.2, leadership: 0.4, creativity: 0 },
  hafeez: { job_performance: 0.4, competency: 0.35, teamwork: 0.15, leadership: 0, creativity: 0.1 },
  sumayna: { job_performance: 0.35, competency: 0.3, teamwork: 0.25, leadership: 0, creativity: 0.1 },
  default: { job_performance: 0.3, competency: 0.3, teamwork: 0.2, leadership: 0.2, creativity: 0 },
};

export const ROLE_WEIGHTS: Record<RoleKey, Record<string, number>> = Object.fromEntries(
  Object.entries(ROLE_SECTION_WEIGHTS).map(([role, weights]) => [
    role,
    Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Math.round(v * 100)])),
  ]),
) as Record<RoleKey, Record<string, number>>;

export const REVIEWER_WEIGHTS = { auto: 0.3, self: 0.1, peer: 0.2, supervisor: 0.4 };

export function resolveRoleKey(name?: string | null): RoleKey {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return "default";
  if (n.includes("tarmisi") || n.includes("ต้า")) return "ta";
  if (n.includes("hafeez") || n.includes("ฮาฟีซ")) return "hafeez";
  if (n.includes("sumayna") || n.includes("สุไมยนา")) return "sumayna";
  return "default";
}

export function getSelfEvaluationType(roleKey: RoleKey): ReviewerType {
  return roleKey === "ta" ? "supervisor" : "self";
}

export function getEligiblePeerReviewers<T extends { id: string; name: string }>(
  evaluatee: T,
  employees: T[],
): T[] {
  const role = resolveRoleKey(evaluatee.name);
  const allowedByRole: Record<RoleKey, RoleKey[]> = {
    ta: ["hafeez", "sumayna"],
    hafeez: ["ta", "sumayna"],
    sumayna: ["ta", "hafeez"],
    default: [],
  };
  const allowed = allowedByRole[role];
  if (!allowed.length) return employees.filter((emp) => emp.id !== evaluatee.id);
  return employees.filter((emp) => emp.id !== evaluatee.id && allowed.includes(resolveRoleKey(emp.name)));
}

const q = (id: string, question: string, type: QuestionType, extra: Partial<KPIQuestion> = {}): KPIQuestion => ({
  id,
  question,
  type,
  ...extra,
});

const sec = (id: string, title: string, color: string, weight: string, questions: KPIQuestion[]): KPISection => ({
  id,
  title,
  color,
  weight,
  questions,
});


  ]),
];

const TA_PEER: KPISection[] = [
  sec("teamwork", "Teamwork", C.team, "หลัก", [
    q("ta_peer_t1", "ต้า brief งานชัดเจนและเข้าใจได้", "rate", { scoreKey: "communication" }),
    q("ta_peer_t2", "ต้าตอบสนองต่อคำถาม/ปัญหาได้ทันเวลา", "rate", { scoreKey: "support" }),
    q("ta_peer_t3", "ต้า approve/reject งานพร้อม reason ชัดเจน", "rate", { scoreKey: "openness" }),
    q("ta_peer_t4", "ต้ารับฟังเมื่อทีมเสนอ idea หรือปัญหา", "rate", { scoreKey: "collaboration" }),
  ]),
<
    q("hf_self_j3", "ความพิถีพิถันในการจัดไฟล์ตาม naming convention", "rate", { scoreKey: "quality" }),
    q("hf_self_j4", "การดูแลอุปกรณ์กล้องและ hard drive", "rate", { scoreKey: "accountability" }),
  ]),
  sec("competency", "Competency", C.comp, "35%", [
    q("hf_self_c1", "ทักษะการถ่ายทำ (exposure, framing, movement)", "rate", { scoreKey: "technical" }),
    q("hf_self_c2", "ทักษะการตัดต่อ (pacing, color grade, sound sync)", "rate", { scoreKey: "problem_solving" }),
    q("hf_self_c3", "ทักษะ graphic/motion", "rate", { scoreKey: "creativity" }),
    q("hf_self_c4", "การแก้ปัญหาเฉพาะหน้าในกองถ่าย", "rate", { scoreKey: "learning" }),
    q("hf_self_c5", "การเรียนรู้ tool หรือ technique ใหม่ในรอบนี้", "text"),
  ]),
  sec("teamwork", "Teamwork", C.team, "15%", [
    q("hf_self_t1", "การซัพพอร์ตทีมในกองถ่าย", "rate", { scoreKey: "support" }),
    q("hf_self_t2", "การสื่อสารเมื่อมีปัญหาหรือ delay", "rate", { scoreKey: "communication" }),
  ]),
  sec("creativity", "Creativity", C.lead, "10%", [

  ]),
];

const HF_PEER: KPISection[] = [
หาหรือต้องการความช่วยเหลือ", "rate", { scoreKey: "communication" }),
    q("hf_peer_t2", "ฮาฟีซพร้อมซัพพอร์ตเมื่อมีงานด่วน", "rate", { scoreKey: "support" }),
    q("hf_peer_t3", "ฮาฟีซรับ feedback และนำไปปรับงานได้", "rate", { scoreKey: "openness" }),
  ]),

    q("hf_peer_j1", "งานของฮาฟีซตรงตามที่ brief ไว้", "rate", { scoreKey: "quality" }),
    q("hf_peer_j2", "ฮาฟีซส่งงานตรงเวลาที่ตกลงกัน", "rate", { scoreKey: "punctuality" }),
    q("hf_peer_j3", "สิ่งที่ฮาฟีซทำได้ดีมากในรอบนี้", "text"),
    q("hf_peer_j4", "สิ่งที่อยากให้ฮาฟีซพัฒนาเพิ่ม", "text"),
  ]),

    q("hf_peer_h1", "Competency technical", "hidden"),
    q("hf_peer_h2", "Creativity score", "hidden"),
  ]),
];

const HF_SUP: KPISection[] = [
<
    q("hf_sup_a1", "Task done ก่อน D-0 (%)", "auto", { autoId: "tasks_ontime_pct" }),
    q("hf_sup_a2", "Revision count เฉลี่ยต่อ task", "auto", { autoId: "revision_avg" }),
    q("hf_sup_a3", "จำนวน task รับผิดชอบในรอบ", "auto", { autoId: "tasks_done_count" }),
  ]),
  sec("job_performance", "Job Performance", C.job, "40%", [
    q("hf_sup_j1", "คุณภาพงานโดยรวมเทียบกับ brief", "rate", { scoreKey: "quality" }),
    q("hf_sup_j2", "ความรับผิดชอบต่ออุปกรณ์และไฟล์งาน", "rate", { scoreKey: "accountability" }),
  ]),

];

const SY_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "35%", [

  ]),
];

const SY_PEER: KPISection[] = [

    q("sy_peer_c1", "สุไมยนาส่ง brief ให้ทีมชัดเจนและครบก่อนเริ่มถ่าย", "rate", { scoreKey: "communication" }),
    q("sy_peer_c2", "สุไมยนาแจ้ง change จาก client ได้ทันเวลา", "rate", { scoreKey: "support" }),
    q("sy_peer_c3", "สุไมยนาเป็น buffer ที่ดีระหว่าง client กับทีม", "rate", { scoreKey: "collaboration" }),
  ]),

    q("sy_peer_t1", "สุไมยนาช่วยทีมเมื่อมีปัญหาเฉพาะหน้า", "rate", { scoreKey: "openness" }),
    q("sy_peer_t2", "สุไมยนารับ feedback และนำไปปรับได้", "rate", { scoreKey: "quality" }),
    q("sy_peer_t3", "สิ่งที่สุไมยนาทำได้ดีมากในรอบนี้", "text"),
    q("sy_peer_t4", "สิ่งที่อยากให้สุไมยนาพัฒนาเพิ่ม", "text"),
  ]),

    q("sy_peer_h1", "Competency การเขียน", "hidden"),
    q("sy_peer_h2", "Creativity score", "hidden"),
  ]),
];

const SY_SUP: KPISection[] = [

    q("sy_sup_a3", "จำนวน client ที่ดูแลในรอบ", "auto", { autoId: "client_count" }),
  ]),
  sec("job_performance", "Job Performance", C.job, "35%", [
    q("sy_sup_j1", "คุณภาพ brief ที่ส่งต่อให้ทีม", "rate", { scoreKey: "quality" }),
    q("sy_sup_j2", "การจัดการ client relationship โดยรวม", "rate", { scoreKey: "accountability" }),
  ]),

};

export const KPI_QUESTIONS: Record<RoleKey, Record<ReviewerType, KPIFormConfig>> = {
  ta: {

  },
  default: DEFAULT_CONFIG,
};
