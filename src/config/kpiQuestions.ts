import type { KpiSubScoreKey } from "@/hooks/useKpi";

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
  labelTh: string;
  type: QuestionType;
  scoreKey?: KpiSubScoreKey;
  autoId?: AutoValueId;
  question?: string;
  helperText?: string;
}

export interface KPISection {
  key: string;
  labelTh: string;
  color: string;
  questions: KPIQuestion[];
  id?: string;
  title?: string;
  weight?: string;
}

export interface KPIFormConfig {
  sections: KPISection[];
  uiLabel?: string;
  note?: string;
}

export const ROLE_WEIGHTS: Record<RoleKey, Record<string, number>> = {
  ta: { job_performance: 20, competency: 20, teamwork: 20, leadership: 40 },
  hafeez: { job_performance: 40, competency: 35, teamwork: 15, leadership: 10 },
  sumayna: { job_performance: 35, competency: 30, teamwork: 25, leadership: 10 },
  default: { job_performance: 30, competency: 30, teamwork: 20, leadership: 20 },
};

export const REVIEWER_WEIGHTS = { auto: 0.3, self: 0.1, peer: 0.2, supervisor: 0.4 };

export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

export function resolveRoleKey(name: string): RoleKey {
  const n = normalizeName(name);

  return "default";
}

export function getEligiblePeerReviewers<T extends { id: string; name: string }>(
  evaluatee: T,
  employees: T[],
): T[] {

const TA_SELF: KPISection[] = [
  sec("job_performance", "ผลการปฏิบัติงาน", C.job, [
    q("ta_self_j1", "ส่งมอบ feedback / approval ให้ทีมทันตามสัญญาณ D-3 ถึง D-0", "rate", { scoreKey: "punctuality" }),
    q("ta_self_j2", "จำนวนโปรเจกต์ที่ปิดได้ในรอบนี้ (ข้อมูลจากระบบ)", "auto", { autoId: "projects_closed" }),
    q("ta_self_j3", "ความถูกต้องของงบประมาณที่ตัดสินใจ (overrun / underrun)", "rate", { scoreKey: "accountability" }),
  ], { id: "job_performance", title: "Job Performance", weight: "20%" }),
  sec("competency", "ความสามารถ / ทักษะ", C.comp, [
    q("ta_self_c1", "การวิเคราะห์และตัดสินใจเชิงธุรกิจ", "rate", { scoreKey: "problem_solving" }),
    q("ta_self_c2", "การบริหารความเสี่ยงในโปรเจกต์", "rate", { scoreKey: "management" }),
    q("ta_self_c3", "การติดตามเทรนด์ที่เกี่ยวข้องกับสตูดิโอ (AI, creative economy)", "rate", { scoreKey: "learning" }),
  ], { id: "competency", title: "Competency", weight: "20%" }),
  sec("teamwork", "การทำงานเป็นทีม", C.team, [
    q("ta_self_t1", "ความชัดเจนของ brief ที่มอบให้ทีม", "rate", { scoreKey: "communication" }),
    q("ta_self_t2", "การรับฟัง feedback จากทีมและ client", "rate", { scoreKey: "openness" }),
    q("ta_self_t3", "การสร้างบรรยากาศที่ทีมทำงานสบายใจ", "rate", { scoreKey: "collaboration" }),
  ], { id: "teamwork", title: "Teamwork", weight: "20%" }),
  sec("leadership", "ภาวะผู้นำ / ธุรกิจ", C.lead, [
    q("ta_self_l1", "ทิศทาง WatSUB! ชัดเจนและสื่อสารให้ทีมเข้าใจ", "rate", { scoreKey: "strategic" }),
    q("ta_self_l2", "การสร้างและรักษาความสัมพันธ์กับ partner/client", "rate", { scoreKey: "presentation" }),
    q("ta_self_l3", "การพัฒนาระบบภายใน (PM, SOP, cashflow)", "rate", { scoreKey: "management" }),
    q("ta_self_l4", "เป้าหมายที่ต้องการพัฒนาในรอบถัดไป", "text"),
  ], { id: "leadership", title: "Leadership / Business", weight: "40%" }),
];

const TA_PEER: KPISection[] = [
  sec("teamwork", "การทำงานร่วมกัน", C.team, [
    q("ta_peer_t1", "ต้า brief งานชัดเจนและเข้าใจได้", "rate", { scoreKey: "communication" }),
    q("ta_peer_t2", "ต้าตอบสนองต่อคำถาม / ปัญหาของทีมได้ทันเวลา", "rate", { scoreKey: "support" }),
    q("ta_peer_t3", "ต้า approve / reject งานพร้อม reason ที่ชัดเจน", "rate", { scoreKey: "openness" }),
    q("ta_peer_t4", "ต้ารับฟังเมื่อทีมเสนอ idea หรือปัญหา", "rate", { scoreKey: "collaboration" }),
  ], { id: "teamwork", title: "Teamwork", weight: "หลัก" }),
  sec("leadership_peer", "การนำทีม", C.lead, [
    q("ta_peer_l1", "รู้สึกว่าต้ามีทิศทางที่ชัดเจนสำหรับสตูดิโอ", "rate", { scoreKey: "strategic" }),
    q("ta_peer_l2", "สิ่งที่ต้าทำได้ดีในการนำทีมรอบนี้", "text"),
    q("ta_peer_l3", "สิ่งที่อยากให้ต้าปรับปรุงหรือพัฒนา", "text"),
  ], { id: "leadership_peer", title: "Leadership (มุมมองทีม)", weight: "รอง" }),
  sec("hidden_peer_only", "ซ่อน", "transparent", [
    q("ta_peer_h1", "Job Performance (ปริมาณงาน, financial)", "hidden"),
    q("ta_peer_h2", "Competency (business analysis, risk)", "hidden"),
  ]),
];

const TA_SUP: KPISection[] = [
  sec("auto_data", "ข้อมูลจากระบบ (อ้างอิง)", C.auto, [
    q("ta_sup_a1", "จำนวนโปรเจกต์ที่ close ในรอบ", "auto", { autoId: "projects_closed" }),
    q("ta_sup_a1_2", "Revenue รวม vs เป้าหมาย Q", "auto", { autoId: "revenue_vs_target_q" }),
    q("ta_sup_a2", "Task ที่ approve ภายใน D-1 (%)", "auto", { autoId: "task_approve_d1" }),
    q("ta_sup_a3", "Task ที่ approve ภายใน D-1 (% on-time)", "auto", { autoId: "tasks_ontime_pct" }),
  ], { id: "auto_data", title: "Auto Data (read-only จากระบบ)", weight: "" }),
  sec("strategic_reflection", "Strategic Self-Reflection", C.lead, [
    q("ta_sup_s1", "เป้าหมาย Q ที่ตั้งไว้ vs ผลที่ทำได้จริงในรอบนี้", "text"),
    q("ta_sup_s2", "ความท้าทายใหญ่สุดในรอบนี้และจัดการอย่างไร", "text"),
    q("ta_sup_s3", "สิ่งที่จะทำต่างออกไปในรอบถัดไป", "text"),
  ], { id: "strategic_reflection", title: "Strategic Reflection", weight: "" }),
];

const HF_SELF: KPISection[] = [
  sec("job_performance", "ผลการปฏิบัติงาน", C.job, [
    q("hf_self_j1", "Task ที่ submit ก่อน D-0 (ข้อมูลจากระบบ)", "auto", { autoId: "tasks_ontime_pct" }),
    q("hf_self_j2", "จำนวน revision หลัง waiting-approval (ข้อมูลจากระบบ)", "auto", { autoId: "revision_avg" }),
    q("hf_self_j3", "ความพิถีพิถันในการจัดไฟล์ตาม naming convention", "rate", { scoreKey: "quality" }),
    q("hf_self_j4", "การดูแลอุปกรณ์กล้องและ hard drive", "rate", { scoreKey: "accountability" }),
  ], { id: "job_performance", title: "Job Performance", weight: "40%" }),
  sec("competency", "ความสามารถ / ทักษะ", C.comp, [
    q("hf_self_c1", "ทักษะการถ่ายทำ (exposure, framing, movement)", "rate", { scoreKey: "technical" }),
    q("hf_self_c2", "ทักษะการตัดต่อ (pacing, color grade, sound sync)", "rate", { scoreKey: "problem_solving" }),
    q("hf_self_c3", "ทักษะ graphic / motion design", "rate", { scoreKey: "creativity" }),
    q("hf_self_c4", "การแก้ปัญหาเฉพาะหน้าในกองถ่าย", "rate", { scoreKey: "learning" }),
    q("hf_self_c5", "การเรียนรู้ tool หรือ technique ใหม่ในรอบนี้ (อธิบาย)", "text"),
  ], { id: "competency", title: "Competency", weight: "35%" }),
  sec("teamwork", "การทำงานเป็นทีม", C.team, [
    q("hf_self_t1", "การซัพพอร์ตทีมในกองถ่าย", "rate", { scoreKey: "support" }),
    q("hf_self_t2", "การสื่อสารเมื่อมีปัญหาหรือ delay", "rate", { scoreKey: "communication" }),
  ], { id: "teamwork", title: "Teamwork", weight: "15%" }),
  sec("creativity", "Creativity & Initiative", C.lead, [
    q("hf_self_cr1", "นำเสนอ shot / visual idea ใหม่นอกเหนือ brief", "rate", { scoreKey: "collaboration" }),
    q("hf_self_cr2", "ผลงานชิ้นที่ภูมิใจสุดในรอบนี้ (ลิงก์หรืออธิบาย)", "text"),
  ], { id: "creativity", title: "Creativity", weight: "10%" }),
];

const HF_PEER: KPISection[] = [
  sec("teamwork_comm", "การสื่อสารและทีมเวิร์ค", C.team, [
    q("hf_peer_t1", "ฮาฟีซสื่อสารเมื่อมีปัญหาหรือต้องการความช่วยเหลือ", "rate", { scoreKey: "communication" }),
    q("hf_peer_t2", "ฮาฟีซพร้อมซัพพอร์ตเมื่อมีงานด่วน", "rate", { scoreKey: "support" }),
    q("hf_peer_t3", "ฮาฟีซรับ feedback และนำไปปรับงานได้", "rate", { scoreKey: "openness" }),
  ], { id: "teamwork_comm", title: "Teamwork & Communication", weight: "หลัก" }),
  sec("job_peer", "ผลงาน", C.job, [
    q("hf_peer_j1", "งานของฮาฟีซตรงตามที่ brief ไว้", "rate", { scoreKey: "quality" }),
    q("hf_peer_j2", "ฮาฟีซส่งงานตรงเวลาที่ตกลงกัน", "rate", { scoreKey: "punctuality" }),
    q("hf_peer_j3", "สิ่งที่ฮาฟีซทำได้ดีมากในรอบนี้", "text"),
    q("hf_peer_j4", "สิ่งที่อยากให้ฮาฟีซพัฒนาเพิ่ม", "text"),
  ], { id: "job_peer", title: "Job Performance (มุมมอง peer)", weight: "รอง" }),
  sec("hidden_competency", "ซ่อน", "transparent", [
    q("hf_peer_h1", "Competency technical", "hidden"),
    q("hf_peer_h2", "Creativity score", "hidden"),
  ]),
];

const HF_SUP: KPISection[] = [
  sec("auto_data", "ข้อมูลจากระบบ (อ้างอิง)", C.auto, [
    q("hf_sup_a1", "Task done ก่อน D-0 (%)", "auto", { autoId: "tasks_ontime_pct" }),
    q("hf_sup_a2", "Revision count เฉลี่ยต่อ task", "auto", { autoId: "revision_avg" }),
    q("hf_sup_a3", "จำนวน task รับผิดชอบในรอบ", "auto", { autoId: "tasks_done_count" }),
  ], { id: "auto_data", title: "Auto Data (read-only จากระบบ)", weight: "" }),
  sec("job_performance", "ผลการปฏิบัติงาน", C.job, [
    q("hf_sup_j1", "คุณภาพงานโดยรวมเทียบกับ brief", "rate", { scoreKey: "quality" }),
    q("hf_sup_j2", "ความรับผิดชอบต่ออุปกรณ์และไฟล์งาน", "rate", { scoreKey: "accountability" }),
  ], { id: "job_performance", title: "Job Performance", weight: "40%" }),
  sec("competency", "ความสามารถ / ทักษะ", C.comp, [
    q("hf_sup_c1", "ระดับทักษะการถ่ายทำในรอบนี้", "rate", { scoreKey: "technical" }),
    q("hf_sup_c2", "ระดับทักษะการตัดต่อ / graphic", "rate", { scoreKey: "problem_solving" }),
    q("hf_sup_c3", "การพัฒนาฝีมือจากรอบที่แล้ว", "rate", { scoreKey: "learning" }),
  ], { id: "competency", title: "Competency", weight: "35%" }),
  sec("creativity_growth", "Creativity & Growth", C.lead, [
    q("hf_sup_cr1", "มี initiative ในงาน creative นอกเหนือ brief", "rate", { scoreKey: "creativity" }),
    q("hf_sup_cr2", "เป้าหมายที่ต้องการเห็นในรอบถัดไป", "text"),
  ], { id: "creativity_growth", title: "Creativity & Growth", weight: "10%" }),
];

const SY_SELF: KPISection[] = [
  sec("job_performance", "ผลการปฏิบัติงาน", C.job, [
    q("sy_self_j1", "Script / caption ที่ส่งตรง production timeline (%)", "auto", { autoId: "scripts_ontime_pct" }),
    q("sy_self_j2", "จำนวน revision ที่ client ขอหลัง submit", "auto", { autoId: "revision_avg" }),
    q("sy_self_j3", "ความครบถ้วนของ client brief ที่รับมาและสรุปให้ทีม", "rate", { scoreKey: "quality" }),
    q("sy_self_j4", "การจัดการ task coordinator ในแต่ละโปรเจกต์", "rate", { scoreKey: "accountability" }),
  ], { id: "job_performance", title: "Job Performance", weight: "35%" }),
  sec("competency", "ความสามารถ / ทักษะ", C.comp, [
    q("sy_self_c1", "คุณภาพการเขียน script / caption (tone, clarity)", "rate", { scoreKey: "technical" }),
    q("sy_self_c2", "ความเข้าใจ brand ของ client แต่ละเจ้า", "rate", { scoreKey: "problem_solving" }),
    q("sy_self_c3", "การสื่อสารกับ client (ความมั่นใจ, ความชัดเจน)", "rate", { scoreKey: "learning" }),
    q("sy_self_c4", "การติดตามเทรนด์ content ที่เกี่ยวข้อง", "rate", { scoreKey: "creativity" }),
    q("sy_self_c5", "สิ่งที่เรียนรู้หรือพัฒนาได้ในรอบนี้", "text"),
  ], { id: "competency", title: "Competency", weight: "30%" }),
  sec("teamwork", "การทำงานเป็นทีม", C.team, [
    q("sy_self_t1", "การส่งต่อ brief ให้ฮาฟีซครบและชัดเจน", "rate", { scoreKey: "communication" }),
    q("sy_self_t2", "การแจ้ง update / change จาก client ให้ทีมทันเวลา", "rate", { scoreKey: "support" }),
    q("sy_self_t3", "การช่วยทีมเมื่อมีงานอื่นกระทบ", "rate", { scoreKey: "collaboration" }),
  ], { id: "teamwork", title: "Teamwork", weight: "25%" }),
  sec("creativity", "Creativity & Initiative", C.lead, [
    q("sy_self_cr1", "นำเสนอ content angle หรือ format ใหม่ในรอบนี้", "rate", { scoreKey: "openness" }),
    q("sy_self_cr2", "Content ชิ้นที่ภูมิใจสุด (ลิงก์หรืออธิบาย)", "text"),
  ], { id: "creativity", title: "Creativity", weight: "10%" }),
];

const SY_PEER: KPISection[] = [
  sec("comm_coord", "การประสานงานและสื่อสาร", C.team, [
    q("sy_peer_c1", "สุไมยนาส่ง brief ให้ทีมชัดเจนและครบก่อนเริ่มถ่าย", "rate", { scoreKey: "communication" }),
    q("sy_peer_c2", "สุไมยนาแจ้ง change จาก client ได้ทันเวลา", "rate", { scoreKey: "support" }),
    q("sy_peer_c3", "สุไมยนาเป็น buffer ที่ดีระหว่าง client กับทีม", "rate", { scoreKey: "collaboration" }),
  ], { id: "comm_coord", title: "Communication & Coordination", weight: "หลัก" }),
  sec("teamwork_peer", "ทีมเวิร์ค", C.job, [
    q("sy_peer_t1", "สุไมยนาช่วยทีมเมื่อมีปัญหาเฉพาะหน้า", "rate", { scoreKey: "openness" }),
    q("sy_peer_t2", "สุไมยนารับ feedback และนำไปปรับได้", "rate", { scoreKey: "quality" }),
    q("sy_peer_t3", "สิ่งที่สุไมยนาทำได้ดีมากในรอบนี้", "text"),
    q("sy_peer_t4", "สิ่งที่อยากให้สุไมยนาพัฒนาเพิ่ม", "text"),
  ], { id: "teamwork_peer", title: "Teamwork (มุมมอง peer)", weight: "รอง" }),
  sec("hidden_writing", "ซ่อน", "transparent", [
    q("sy_peer_h1", "Competency การเขียน", "hidden"),
    q("sy_peer_h2", "Creativity score", "hidden"),
  ]),
];

const SY_SUP: KPISection[] = [
  sec("auto_data", "ข้อมูลจากระบบ (อ้างอิง)", C.auto, [
    q("sy_sup_a1", "Script / caption ที่ on-time (%)", "auto", { autoId: "scripts_ontime_pct" }),
    q("sy_sup_a2", "Revision จาก client เฉลี่ยต่อชิ้น", "auto", { autoId: "revision_avg" }),
    q("sy_sup_a3", "จำนวน client ที่ดูแลในรอบ", "auto", { autoId: "client_count" }),
  ], { id: "auto_data", title: "Auto Data (read-only จากระบบ)", weight: "" }),
  sec("job_performance", "ผลการปฏิบัติงาน", C.job, [
    q("sy_sup_j1", "คุณภาพ brief ที่ส่งต่อให้ทีม", "rate", { scoreKey: "quality" }),
    q("sy_sup_j2", "การจัดการ client relationship โดยรวม", "rate", { scoreKey: "accountability" }),
  ], { id: "job_performance", title: "Job Performance", weight: "35%" }),
  sec("competency", "ความสามารถ / ทักษะ", C.comp, [
    q("sy_sup_c1", "ระดับทักษะการเขียน script / caption", "rate", { scoreKey: "technical" }),
    q("sy_sup_c2", "ความเข้าใจ brand และ target audience ของ client", "rate", { scoreKey: "problem_solving" }),
    q("sy_sup_c3", "การพัฒนาจากรอบที่แล้ว", "rate", { scoreKey: "learning" }),
  ], { id: "competency", title: "Competency", weight: "30%" }),
  sec("teamwork_creativity", "ทีมเวิร์คและ Initiative", C.lead, [
    q("sy_sup_tc1", "ทำหน้าที่ coordinator ได้ smooth", "rate", { scoreKey: "collaboration" }),
    q("sy_sup_tc2", "มี initiative ในงาน content strategy", "rate", { scoreKey: "creativity" }),
    q("sy_sup_tc3", "เป้าหมายที่ต้องการเห็นในรอบถัดไป", "text"),
  ], { id: "teamwork_creativity", title: "Teamwork & Creativity", weight: "25% + 10%" }),
];

const DEFAULT_CONFIG: Record<ReviewerType, KPIFormConfig> = {
  self: {
    sections: [
      sec("job_performance", "ผลการปฏิบัติงาน", C.job, [
        q("df_self_j1", "คุณภาพงานโดยรวมเทียบกับ brief / เป้าหมาย", "rate", { scoreKey: "quality" }),
        q("df_self_j2", "ปริมาณงานที่ทำได้ในรอบ (ข้อมูลจากระบบ)", "auto", { autoId: "tasks_done_count" }),
        q("df_self_j3", "ส่งงานตรงเวลาตาม timeline ที่กำหนด", "rate", { scoreKey: "punctuality" }),
      ]),
    ],
  },
  peer: {
    sections: [
      sec("job_teamwork", "ผลงานและการทำงานร่วมกัน", C.job, [
        q("df_peer_j1", "งานที่ทำออกมาตรงตามที่ตกลงและตรงเวลา", "rate", { scoreKey: "quality" }),
        q("df_peer_j2", "การสื่อสารเมื่อมีปัญหาหรือต้องการความช่วยเหลือ", "rate", { scoreKey: "communication" }),
        q("df_peer_j3", "พร้อมช่วยซัพพอร์ตทีมเมื่อมีงานเร่ง", "rate", { scoreKey: "support" }),
      ]),
    ],
  },
  supervisor: {
    sections: [
      sec("auto_data", "ข้อมูลจากระบบ (อ้างอิง)", C.auto, [
        q("df_sup_a1", "งานที่ส่งตรงเวลา (%)", "auto", { autoId: "tasks_ontime_pct" }),
        q("df_sup_a2", "จำนวน task ที่ทำเสร็จในรอบ", "auto", { autoId: "tasks_done_count" }),
      ]),
    ],
  },
};

export const KPI_QUESTIONS: Record<RoleKey, Record<ReviewerType, KPIFormConfig>> = {
  ta: {
    self: {

    },
    peer: {

    },
    supervisor: {
      uiLabel: "Self-Reflection",

    },
  },
  hafeez: {
    self: {
      note: "ฮาฟีซประเมินตัวเองในด้าน Production และ Creativity — ไม่มีหัวข้อ Client Management",
      sections: HF_SELF,
    },
    peer: {
      note: "Peer ของฮาฟีซ = ต้า + สุไมยนา — ประเมินสิ่งที่ทำงานด้วยกันโดยตรง",
      sections: HF_PEER,
    },
    supervisor: {
      note: "ต้าประเมินฮาฟีซ — เห็นทุก section รวม auto data",
      sections: HF_SUP,
    },
  },
  sumayna: {
    self: {
      note: "สุไมยนาประเมินตัวเองในด้าน Content และ Client — ไม่มีหัวข้อ Technical Production",
      sections: SY_SELF,
    },
    peer: {
      note: "Peer ของสุไมยนา = ต้า + ฮาฟีซ — ประเมินในมุมที่ทำงานร่วมกัน",
      sections: SY_PEER,
    },
    supervisor: {
      note: "ต้าประเมินสุไมยนา — เห็นทุก section รวม auto data",
      sections: SY_SUP,
    },
  },
  default: DEFAULT_CONFIG,
};
