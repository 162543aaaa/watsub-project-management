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

export function canSeePeerIdentity(viewer: { role?: string | null }): boolean {
  if (viewer.role?.toLowerCase().includes("admin")) return true;
  if (viewer.role?.toLowerCase().includes("director")) return true;
  return false;
}

const C = {
  auto: "hsl(215 14% 45%)",
  job: "hsl(191 91% 37%)",
  comp: "hsl(262 83% 58%)",
  team: "hsl(142 71% 45%)",
  lead: "hsl(38 92% 50%)",
};

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

const TA_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "20%", [
    q("ta_self_j1", "ส่ง feedback/approval ทีมทัน D-3 ถึง D-0", "rate", { scoreKey: "punctuality" }),
    q("ta_self_j2", "จำนวนโปรเจกต์ที่ปิดได้ในรอบ", "auto", { autoId: "projects_closed" }),
    q("ta_self_j3", "ความถูกต้องของงบประมาณที่ตัดสินใจ", "rate", { scoreKey: "accountability" }),
  ]),
  sec("competency", "Competency", C.comp, "20%", [
    q("ta_self_c1", "การวิเคราะห์และตัดสินใจเชิงธุรกิจ", "rate", { scoreKey: "problem_solving" }),
    q("ta_self_c2", "การบริหารความเสี่ยงในโปรเจกต์", "rate", { scoreKey: "management" }),
    q("ta_self_c3", "การติดตามเทรนด์ (AI, creative economy)", "rate", { scoreKey: "learning" }),
  ]),
  sec("teamwork", "Teamwork", C.team, "20%", [
    q("ta_self_t1", "ความชัดเจนของ brief ที่มอบให้ทีม", "rate", { scoreKey: "communication" }),
    q("ta_self_t2", "การรับฟัง feedback จากทีมและ client", "rate", { scoreKey: "openness" }),
    q("ta_self_t3", "การสร้างบรรยากาศที่ทีมทำงานสบายใจ", "rate", { scoreKey: "collaboration" }),
  ]),
  sec("leadership", "Leadership", C.lead, "40%", [
    q("ta_self_l1", "ทิศทาง WatSUB! ชัดเจนและสื่อสารให้ทีมเข้าใจ", "rate", { scoreKey: "strategic" }),
    q("ta_self_l2", "การสร้างและรักษาความสัมพันธ์กับ partner/client", "rate", { scoreKey: "presentation" }),
    q("ta_self_l3", "การพัฒนาระบบภายใน (PM, SOP, cashflow)", "rate", { scoreKey: "management" }),
    q("ta_self_l4", "เป้าหมายที่ต้องการพัฒนาในรอบถัดไป", "text"),
  ]),
];

const TA_PEER: KPISection[] = [
  sec("teamwork", "Teamwork", C.team, "หลัก", [
    q("ta_peer_t1", "ต้า brief งานชัดเจนและเข้าใจได้", "rate", { scoreKey: "communication" }),
    q("ta_peer_t2", "ต้าตอบสนองต่อคำถาม/ปัญหาได้ทันเวลา", "rate", { scoreKey: "support" }),
    q("ta_peer_t3", "ต้า approve/reject งานพร้อม reason ชัดเจน", "rate", { scoreKey: "openness" }),
    q("ta_peer_t4", "ต้ารับฟังเมื่อทีมเสนอ idea หรือปัญหา", "rate", { scoreKey: "collaboration" }),
  ]),
  sec("leadership_peer", "Leadership (Peer view)", C.lead, "รอง", [
    q("ta_peer_l1", "รู้สึกว่าต้ามีทิศทางที่ชัดเจนสำหรับสตูดิโอ", "rate", { scoreKey: "strategic" }),
    q("ta_peer_l2", "สิ่งที่ต้าทำได้ดีในการนำทีมรอบนี้", "text"),
    q("ta_peer_l3", "สิ่งที่อยากให้ต้าปรับปรุง", "text"),
  ]),
  sec("hidden_scope", "Hidden scope for peer", "transparent", "hidden", [
    q("ta_peer_h1", "Job Performance hidden for peer", "hidden"),
    q("ta_peer_h2", "Competency hidden for peer", "hidden"),
  ]),
];

const TA_SUP: KPISection[] = [
  sec("auto_data", "Auto Data", C.auto, "Read-only", [
    q("ta_sup_a1", "จำนวนโปรเจกต์ที่ close ในรอบ", "auto", { autoId: "projects_closed" }),
    q("ta_sup_a2", "Revenue รวม vs เป้าหมาย Q", "auto", { autoId: "revenue_vs_target_q" }),
    q("ta_sup_a3", "Task ที่ approve ภายใน D-1", "auto", { autoId: "task_approve_d1" }),
  ]),
  sec("strategic_reflection", "Strategic Reflection", C.lead, "Required", [
    q("ta_sup_s1", "เป้าหมาย Q ที่ตั้งไว้ vs ผลจริง", "text"),
    q("ta_sup_s2", "ความท้าทายใหญ่สุดรอบนี้และจัดการอย่างไร", "text"),
    q("ta_sup_s3", "สิ่งที่จะทำต่างออกไปในรอบถัดไป", "text"),
  ]),
];

const HF_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "40%", [
    q("hf_self_j1", "Task ที่ submit ก่อน D-0", "auto", { autoId: "tasks_ontime_pct" }),
    q("hf_self_j2", "จำนวน revision หลัง waiting-approval", "auto", { autoId: "revision_avg" }),
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
    q("hf_self_cr1", "นำเสนอ shot/visual idea ใหม่นอกเหนือ brief", "rate", { scoreKey: "collaboration" }),
    q("hf_self_cr2", "ผลงานชิ้นที่ภูมิใจสุดในรอบนี้ (ลิงก์หรืออธิบาย)", "text"),
  ]),
];

const HF_PEER: KPISection[] = [
  sec("teamwork_comm", "Teamwork & Communication", C.team, "หลัก", [
    q("hf_peer_t1", "ฮาฟีซสื่อสารเมื่อมีปัญหาหรือต้องการความช่วยเหลือ", "rate", { scoreKey: "communication" }),
    q("hf_peer_t2", "ฮาฟีซพร้อมซัพพอร์ตเมื่อมีงานด่วน", "rate", { scoreKey: "support" }),
    q("hf_peer_t3", "ฮาฟีซรับ feedback และนำไปปรับงานได้", "rate", { scoreKey: "openness" }),
  ]),
  sec("job_peer", "Job Performance (Peer)", C.job, "รอง", [
    q("hf_peer_j1", "งานของฮาฟีซตรงตามที่ brief ไว้", "rate", { scoreKey: "quality" }),
    q("hf_peer_j2", "ฮาฟีซส่งงานตรงเวลาที่ตกลงกัน", "rate", { scoreKey: "punctuality" }),
    q("hf_peer_j3", "สิ่งที่ฮาฟีซทำได้ดีมากในรอบนี้", "text"),
    q("hf_peer_j4", "สิ่งที่อยากให้ฮาฟีซพัฒนาเพิ่ม", "text"),
  ]),
  sec("hidden", "Hidden", "transparent", "hidden", [
    q("hf_peer_h1", "Competency technical", "hidden"),
    q("hf_peer_h2", "Creativity score", "hidden"),
  ]),
];

const HF_SUP: KPISection[] = [
  sec("auto_data", "Auto Data", C.auto, "Read-only", [
    q("hf_sup_a1", "Task done ก่อน D-0 (%)", "auto", { autoId: "tasks_ontime_pct" }),
    q("hf_sup_a2", "Revision count เฉลี่ยต่อ task", "auto", { autoId: "revision_avg" }),
    q("hf_sup_a3", "จำนวน task รับผิดชอบในรอบ", "auto", { autoId: "tasks_done_count" }),
  ]),
  sec("job_performance", "Job Performance", C.job, "40%", [
    q("hf_sup_j1", "คุณภาพงานโดยรวมเทียบกับ brief", "rate", { scoreKey: "quality" }),
    q("hf_sup_j2", "ความรับผิดชอบต่ออุปกรณ์และไฟล์งาน", "rate", { scoreKey: "accountability" }),
  ]),
  sec("competency", "Competency", C.comp, "35%", [
    q("hf_sup_c1", "ระดับทักษะการถ่ายทำในรอบนี้", "rate", { scoreKey: "technical" }),
    q("hf_sup_c2", "ระดับทักษะการตัดต่อ/graphic", "rate", { scoreKey: "problem_solving" }),
    q("hf_sup_c3", "การพัฒนาจากรอบที่แล้ว", "rate", { scoreKey: "learning" }),
  ]),
  sec("creativity_growth", "Creativity & Growth", C.lead, "10%", [
    q("hf_sup_cr1", "มี initiative ในงาน creative", "rate", { scoreKey: "creativity" }),
    q("hf_sup_cr2", "เป้าหมายที่ต้องการเห็นในรอบถัดไป", "text"),
  ]),
];

const SY_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "35%", [
    q("sy_self_j1", "Script/caption ที่ส่งตรงเวลาตาม production timeline", "auto", { autoId: "scripts_ontime_pct" }),
    q("sy_self_j2", "จำนวน revision ที่ client ขอหลัง submit", "auto", { autoId: "revision_avg" }),
    q("sy_self_j3", "ความครบถ้วนของ client brief ที่รับมาและสรุปให้ทีม", "rate", { scoreKey: "quality" }),
    q("sy_self_j4", "การจัดการ task coordinator ในแต่ละโปรเจกต์", "rate", { scoreKey: "accountability" }),
  ]),
  sec("competency", "Competency", C.comp, "30%", [
    q("sy_self_c1", "คุณภาพการเขียน script/caption (tone, clarity)", "rate", { scoreKey: "technical" }),
    q("sy_self_c2", "ความเข้าใจ brand ของ client แต่ละเจ้า", "rate", { scoreKey: "problem_solving" }),
    q("sy_self_c3", "การสื่อสารกับ client (ความมั่นใจ, ความชัดเจน)", "rate", { scoreKey: "learning" }),
    q("sy_self_c4", "การติดตามเทรนด์ content ที่เกี่ยวข้อง", "rate", { scoreKey: "creativity" }),
    q("sy_self_c5", "สิ่งที่เรียนรู้หรือพัฒนาได้ในรอบนี้", "text"),
  ]),
  sec("teamwork", "Teamwork", C.team, "25%", [
    q("sy_self_t1", "การส่งต่อ brief ให้ฮาฟีซครบและชัดเจน", "rate", { scoreKey: "communication" }),
    q("sy_self_t2", "การแจ้ง update/change จาก client ให้ทีมทันเวลา", "rate", { scoreKey: "support" }),
    q("sy_self_t3", "การช่วยทีมเมื่อมีงานอื่นกระทบ", "rate", { scoreKey: "collaboration" }),
  ]),
  sec("creativity", "Creativity", C.lead, "10%", [
    q("sy_self_cr1", "นำเสนอ content angle หรือ format ใหม่ในรอบนี้", "rate", { scoreKey: "openness" }),
    q("sy_self_cr2", "content ชิ้นที่ภูมิใจสุด (ลิงก์หรืออธิบาย)", "text"),
  ]),
];

const SY_PEER: KPISection[] = [
  sec("comm_coord", "Communication & Coordination", C.team, "หลัก", [
    q("sy_peer_c1", "สุไมยนาส่ง brief ให้ทีมชัดเจนและครบก่อนเริ่มถ่าย", "rate", { scoreKey: "communication" }),
    q("sy_peer_c2", "สุไมยนาแจ้ง change จาก client ได้ทันเวลา", "rate", { scoreKey: "support" }),
    q("sy_peer_c3", "สุไมยนาเป็น buffer ที่ดีระหว่าง client กับทีม", "rate", { scoreKey: "collaboration" }),
  ]),
  sec("teamwork_peer", "Teamwork (Peer)", C.job, "รอง", [
    q("sy_peer_t1", "สุไมยนาช่วยทีมเมื่อมีปัญหาเฉพาะหน้า", "rate", { scoreKey: "openness" }),
    q("sy_peer_t2", "สุไมยนารับ feedback และนำไปปรับได้", "rate", { scoreKey: "quality" }),
    q("sy_peer_t3", "สิ่งที่สุไมยนาทำได้ดีมากในรอบนี้", "text"),
    q("sy_peer_t4", "สิ่งที่อยากให้สุไมยนาพัฒนาเพิ่ม", "text"),
  ]),
  sec("hidden", "Hidden", "transparent", "hidden", [
    q("sy_peer_h1", "Competency การเขียน", "hidden"),
    q("sy_peer_h2", "Creativity score", "hidden"),
  ]),
];

const SY_SUP: KPISection[] = [
  sec("auto_data", "Auto Data", C.auto, "Read-only", [
    q("sy_sup_a1", "Script/caption ที่ on-time (%)", "auto", { autoId: "scripts_ontime_pct" }),
    q("sy_sup_a2", "Revision จาก client เฉลี่ย", "auto", { autoId: "revision_avg" }),
    q("sy_sup_a3", "จำนวน client ที่ดูแลในรอบ", "auto", { autoId: "client_count" }),
  ]),
  sec("job_performance", "Job Performance", C.job, "35%", [
    q("sy_sup_j1", "คุณภาพ brief ที่ส่งต่อให้ทีม", "rate", { scoreKey: "quality" }),
    q("sy_sup_j2", "การจัดการ client relationship โดยรวม", "rate", { scoreKey: "accountability" }),
  ]),
  sec("competency", "Competency", C.comp, "30%", [
    q("sy_sup_c1", "ระดับทักษะการเขียน script/caption", "rate", { scoreKey: "technical" }),
    q("sy_sup_c2", "ความเข้าใจ brand และ target audience ของ client", "rate", { scoreKey: "problem_solving" }),
    q("sy_sup_c3", "การพัฒนาจากรอบที่แล้ว", "rate", { scoreKey: "learning" }),
  ]),
  sec("teamwork_creativity", "Teamwork & Creativity", C.lead, "25%+10%", [
    q("sy_sup_tc1", "ทำหน้าที่ coordinator ได้ smooth", "rate", { scoreKey: "collaboration" }),
    q("sy_sup_tc2", "มี initiative ในงาน content strategy", "rate", { scoreKey: "creativity" }),
    q("sy_sup_tc3", "เป้าหมายที่ต้องการเห็นในรอบถัดไป", "text"),
  ]),
];

const DEFAULT_CONFIG: Record<ReviewerType, KPIFormConfig> = {
  self: {
    note: "แบบประเมินตนเองทั่วไป",
    sections: [
      sec("job_performance", "Job Performance", C.job, "100%", [
        q("df_self_j1", "คุณภาพงานโดยรวม", "rate", { scoreKey: "quality" }),
      ]),
    ],
  },
  peer: {
    note: "แบบประเมิน peer ทั่วไป",
    sections: [
      sec("teamwork", "Teamwork", C.team, "100%", [
        q("df_peer_j1", "การทำงานร่วมกัน", "rate", { scoreKey: "communication" }),
      ]),
    ],
  },
  supervisor: {
    note: "แบบประเมิน supervisor ทั่วไป",
    sections: [
      sec("auto_data", "Auto Data", C.auto, "100%", [
        q("df_sup_a1", "งานที่ส่งตรงเวลา", "auto", { autoId: "tasks_ontime_pct" }),
      ]),
    ],
  },
};

export const KPI_QUESTIONS: Record<RoleKey, Record<ReviewerType, KPIFormConfig>> = {
  ta: {
    self: { note: "Director self evaluation", sections: TA_SELF },
    peer: { note: "ฮาฟีซ + สุไมยนา ประเมินแบบ peer", sections: TA_PEER },
    supervisor: { note: "ใช้ key supervisor แต่แสดงเป็น Self-Reflection", uiLabel: "Self-Reflection", sections: TA_SUP },
  },
  hafeez: {
    self: { note: "Production self evaluation", sections: HF_SELF },
    peer: { note: "ต้า + สุไมยนา ประเมินฮาฟีซ", sections: HF_PEER },
    supervisor: { note: "Supervisor review ของฮาฟีซ", sections: HF_SUP },
  },
  sumayna: {
    self: { note: "Strategy self evaluation", sections: SY_SELF },
    peer: { note: "ต้า + ฮาฟีซ ประเมินสุไมยนา", sections: SY_PEER },
    supervisor: { note: "Supervisor review ของสุไมยนา", sections: SY_SUP },
  },
  default: DEFAULT_CONFIG,
};
