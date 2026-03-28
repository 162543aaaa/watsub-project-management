import type { KpiCategoryKey, KpiSubScoreKey } from "@/hooks/useKpi";

export type RoleKey = "ta" | "hafeez" | "sumayna" | "outsource" | "default";
export type ReviewerType = "self" | "peer" | "supervisor";
export type QuestionType = "auto" | "rate" | "text" | "hidden";

export type AutoValueId =
  | "on_time_rate"
  | "avg_revision"
  | "total_tasks"
  | "closed_projects"
  | "total_clients"
  | "script_on_time"
  | "client_revision_avg"
  | "revenue_vs_target_q";

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

const scoreByCategory: Record<string, KpiSubScoreKey[]> = {
  job_performance: ["quality", "quantity", "punctuality", "accountability"],
  competency: ["technical", "problem_solving", "learning", "decision_making"],
  teamwork: ["communication", "support", "openness", "collaboration"],
  leadership: ["presentation", "decision_making", "management", "strategic"],
  creativity: ["creativity", "openness", "collaboration", "learning"],
  collaboration: ["communication", "support", "openness", "collaboration"],
};

function scoreFor(cat: string, i: number): KpiSubScoreKey {
  const list = scoreByCategory[cat] ?? scoreByCategory.teamwork;
  return list[i % list.length];
}

export const ROLE_SECTION_WEIGHTS: Record<RoleKey, Record<string, number>> = {
  ta: { job_performance: 0.2, competency: 0.2, teamwork: 0.2, leadership: 0.4, creativity: 0, collaboration: 0 },
  hafeez: { job_performance: 0.4, competency: 0.35, teamwork: 0.15, leadership: 0, creativity: 0.1, collaboration: 0 },
  sumayna: { job_performance: 0.35, competency: 0.3, teamwork: 0.25, leadership: 0, creativity: 0.1, collaboration: 0 },
  outsource: { job_performance: 0.45, competency: 0.4, teamwork: 0, leadership: 0, creativity: 0, collaboration: 0.15 },
  default: { job_performance: 0.3, competency: 0.3, teamwork: 0.2, leadership: 0.2, creativity: 0, collaboration: 0 },
};

export const ROLE_WEIGHTS: Record<RoleKey, Record<string, number>> = Object.fromEntries(
  Object.entries(ROLE_SECTION_WEIGHTS).map(([role, weights]) => [
    role,
    Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Math.round(v * 100)])),
  ]),
) as Record<RoleKey, Record<string, number>>;

export const REVIEWER_WEIGHTS = { auto: 0.3, self: 0.1, peer: 0.2, supervisor: 0.4 };

const ROLE_ALIASES: Record<RoleKey, string[]> = {
  ta: ["director"],
  hafeez: ["production"],
  sumayna: ["strategy"],
  outsource: ["outsource", "freelance", "external"],
  default: [],
};

export function resolveRoleKey(input?:
  | string
  | null
  | { name?: string | null; kpi_role?: string | null; role?: string | null; type?: string | null }): RoleKey {
  const normalize = (v?: string | null) => (v ?? "").trim().toLowerCase();
  if (!input) return "default";

  const text = typeof input === "string"
    ? normalize(input)
    : [normalize(input.kpi_role), normalize(input.role), normalize(input.type), normalize(input.name)].join(" ");

  if (!text) return "default";
  for (const role of ["ta", "hafeez", "sumayna", "outsource"] as const) {
    if (ROLE_ALIASES[role].some((alias) => text.includes(alias))) return role;
  }
  return "default";
}

export function getSelfEvaluationType(roleKey: RoleKey): ReviewerType {
  return roleKey === "ta" ? "supervisor" : "self";
}

export function getEligiblePeerReviewers<T extends { id: string; name?: string; kpi_role?: string; role?: string; type?: string }>(
  evaluatee: T,
  employees: T[],
): T[] {
  const role = resolveRoleKey(evaluatee);
  if (role === "outsource") {
    return employees.filter((emp) => emp.id !== evaluatee.id && resolveRoleKey(emp) !== "outsource");
  }

  const allowedByRole: Record<RoleKey, RoleKey[]> = {
    ta: ["hafeez", "sumayna"],
    hafeez: ["ta", "sumayna"],
    sumayna: ["ta", "hafeez"],
    outsource: ["ta", "hafeez", "sumayna"],
    default: [],
  };

  const allowed = allowedByRole[role];
  if (!allowed.length) return employees.filter((emp) => emp.id !== evaluatee.id);
  return employees.filter((emp) => emp.id !== evaluatee.id && allowed.includes(resolveRoleKey(emp)));
}

export function canSeePeerIdentity(viewer: { role?: string | null }): boolean {
  if (viewer.role?.toLowerCase().includes("admin")) return true;
  if (viewer.role?.toLowerCase().includes("director")) return true;
  if (viewer.role?.toLowerCase().includes("supervisor")) return true;
  return false;
}

const C = {
  auto: "hsl(215 14% 45%)",
  job: "hsl(191 91% 37%)",
  comp: "hsl(262 83% 58%)",
  team: "hsl(142 71% 45%)",
  lead: "hsl(38 92% 50%)",
};

const q = (id: string, question: string, type: QuestionType, extra: Partial<KPIQuestion> = {}): KPIQuestion => ({ id, question, type, ...extra });
const sec = (id: string, title: string, color: string, weight: string, questions: KPIQuestion[]): KPISection => ({ id, title, color, weight, questions });
const rates = (prefix: string, cat: string, lines: string[]) => lines.map((line, i) => q(`${prefix}_${i + 1}`, line, "rate", { scoreKey: scoreFor(cat, i) }));
const texts = (prefix: string, lines: string[]) => lines.map((line, i) => q(`${prefix}_${i + 1}`, line, "text"));

const TA_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "20%", [
    ...rates("ta_self_job", "job_performance", [
      "ส่ง feedback และ approval ให้ทีมตามสัญญาณ D-3 ถึง D-0 ทุกครั้ง",
      "ความแม่นยำของงบประมาณที่วางแผนไว้ vs ค่าใช้จ่ายจริง",
      "ติดตาม cashflow และ payment จาก client ได้ครบถ้วน",
      "จัดการเอกสารสัญญาและ scope of work ให้ชัดเจนก่อนเริ่มงาน",
      "รับผิดชอบและแก้ปัญหาเมื่อโปรเจกต์ไม่เป็นไปตามแผน",
    ]),
    q("ta_self_job_auto_1", "จำนวนโปรเจกต์ที่ปิด (close) ได้ในรอบนี้", "auto", { autoId: "closed_projects" }),
  ]),
  sec("competency", "Competency", C.comp, "20%", [
    ...rates("ta_self_comp", "competency", [
      "วิเคราะห์สถานการณ์และตัดสินใจเชิงธุรกิจได้ทันเวลา",
      "บริหารความเสี่ยงของโปรเจกต์ก่อนที่จะกลายเป็นปัญหา",
      "ติดตามเทรนด์ที่เกี่ยวข้อง เช่น AI tools, creative economy, local market",
      "นำเสนอ proposal หรือ pitch ให้ client เข้าใจและตัดสินใจได้",
      "เจรจาต่อรองราคาและเงื่อนไขกับ client หรือ supplier ได้",
      "ออกแบบและพัฒนาระบบหรือ process ภายในสตูดิโอให้ดีขึ้น",
    ]),
    ...texts("ta_self_comp_text", ["สิ่งที่ได้เรียนรู้ด้านธุรกิจหรือการบริหารในรอบนี้"]),
  ]),
  sec("teamwork", "Teamwork", C.team, "20%", rates("ta_self_team", "teamwork", [
    "มอบหมายงานพร้อม brief ที่ชัดเจนก่อนเริ่ม production",
    "รับฟัง feedback จากทีมและนำไปปรับทิศทาง",
    "สร้างบรรยากาศที่ทีมรู้สึกปลอดภัยในการแสดงความคิดเห็น",
    "ให้เวลาและพื้นที่ทีมพัฒนาทักษะของตัวเอง",
    "จัดการ conflict หรือความขัดแย้งในทีมได้อย่างสร้างสรรค์",
    "ยอมรับเมื่อตัดสินใจผิดพลาดและแก้ไขให้ทีมเห็น",
  ])),
  sec("leadership", "Leadership / Business", C.lead, "40%", [
    ...rates("ta_self_lead", "leadership", [
      "ทิศทางและ vision ของ WatSUB! ชัดเจนและสื่อสารให้ทีมเข้าใจได้",
      "สร้างและรักษาความสัมพันธ์กับ partner และ client ระยะยาว",
      "พัฒนาระบบภายใน (PM, SOP, cashflow, Drive structure) อย่างต่อเนื่อง",
      "วางแผนรายได้และควบคุมค่าใช้จ่ายให้สตูดิโออยู่ได้",
      "สร้างโอกาสธุรกิจใหม่ หรือ service ใหม่ในรอบนี้",
      "ตัดสินใจเรื่อง hiring หรือ outsource ได้ถูกต้องตามความต้องการจริง",
      "ดูแล positioning ของ WatSUB! ในตลาด Pattani creative scene",
    ]),
    ...texts("ta_self_lead_text", [
      "เป้าหมาย Q ที่ตั้งไว้ vs ผลจริง (อธิบาย)",
      "ความท้าทายใหญ่สุดรอบนี้และวิธีที่จัดการ",
      "สิ่งที่จะทำต่างออกไปในรอบถัดไป",
    ]),
  ]),
];

const TA_PEER: KPISection[] = [
  sec("lead", "การ Lead และสั่งงาน", C.team, "peer", rates("ta_peer_lead", "teamwork", [
    "Tarmisi brief งานชัดเจนก่อนเริ่มทุกครั้ง",
    "Tarmisi ระบุ deadline และ priority ของงานให้ชัดเจน",
    "Tarmisi approve หรือ reject งานพร้อม reason ที่ทีมนำไปปรับได้",
    "Tarmisi ตอบสนองต่อคำถามหรือปัญหาได้ทันเวลา",
    "Tarmisi ไม่เปลี่ยน direction กลางคันโดยไม่มี reason",
  ])),
  sec("relation", "ความสัมพันธ์กับทีม", C.comp, "peer", [
    ...rates("ta_peer_rel", "teamwork", [
      "รู้สึกว่า Tarmisi รับฟังเมื่อเราเสนอ idea หรือแจ้งปัญหา",
      "Tarmisi ให้ feedback ที่ช่วยให้พัฒนาได้จริง ไม่ใช่แค่วิจารณ์",
      "รู้สึก safe ที่จะพูดตรงๆ กับ Tarmisi เมื่อมีปัญหา",
      "Tarmisi ยอมรับเมื่อตัดสินใจผิดและแก้ไข",
    ]),
  ]),
  sec("direction", "ทิศทางสตูดิโอ", C.lead, "peer", [
    ...rates("ta_peer_dir", "leadership", [
      "รู้สึกว่า WatSUB! มีทิศทางที่ชัดเจนในรอบนี้",
      "เข้าใจว่าตัวเองมีบทบาทอะไรใน vision ของ WatSUB!",
    ]),
    ...texts("ta_peer_dir_text", [
      "สิ่งที่ Tarmisi ทำได้ดีมากในรอบนี้",
      "สิ่งที่อยากให้ Tarmisi ปรับเพื่อให้ทีมทำงานได้ดีขึ้น",
    ]),
  ]),
];

const TA_SUP: KPISection[] = [
  sec("auto_data", "Auto Data", C.auto, "read-only", [
    q("ta_sup_auto_1", "จำนวนโปรเจกต์ที่ close ในรอบ", "auto", { autoId: "closed_projects" }),
    q("ta_sup_auto_2", "Revenue รวมในรอบ vs เป้าหมาย Q", "auto", { autoId: "revenue_vs_target_q" }),
    q("ta_sup_auto_3", "Task ที่ approve ภายใน D-1 (%)", "auto", { autoId: "on_time_rate" }),
    q("ta_sup_auto_4", "จำนวน client ที่ทำงานด้วยในรอบ", "auto", { autoId: "total_clients" }),
  ]),
  sec("reflection", "Strategic Reflection", C.lead, "required", texts("ta_sup_text", [
    "เป้าหมาย Q ที่ตั้งไว้ vs ผลจริง — ตรงไหนสำเร็จ ตรงไหนพลาด",
    "ความท้าทายใหญ่สุดรอบนี้และวิธีที่จัดการ",
    "ระบบหรือ process ที่พัฒนาขึ้นในรอบนี้ มีผลอย่างไรกับทีม",
    "client หรือ project ที่ภูมิใจสุดในรอบนี้ เพราะอะไร",
    "สิ่งที่จะทำต่างออกไปในรอบถัดไป",
    "เป้าหมาย 3 อย่างสำหรับรอบถัดไป",
  ])),
];

const HF_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "40%", [
    q("hf_self_auto_1", "Task ที่ submit ก่อน D-0", "auto", { autoId: "on_time_rate" }),
    q("hf_self_auto_2", "จำนวน revision หลัง waiting-approval", "auto", { autoId: "avg_revision" }),
    ...rates("hf_self_job", "job_performance", [
      "จัดไฟล์ตาม naming convention [PROJECT]_[TYPE]_[VERSION]_[YYYYMM]",
      "ดูแลอุปกรณ์กล้อง, hard drive และ cable ให้พร้อมใช้เสมอ",
      "เช็ก battery, card และ settings ก่อนถ่ายทุกครั้ง",
      "แจ้งทีมเมื่อมี delay หรือปัญหาเกิดขึ้นระหว่างงาน",
      "ทำตาม production checklist ครบก่อนส่งงาน",
    ]),
  ]),
  sec("competency", "Competency — ถ่ายทำ/ตัดต่อ", C.comp, "35%", [
    ...rates("hf_self_comp", "competency", [
      "ควบคุม exposure, white balance และ focus ได้ถูกต้อง",
      "จัด framing และ composition ได้สวยงามตาม brief",
      "เคลื่อนกล้องได้ smooth (handheld, slider, gimbal)",
      "เลือก lens และ focal length ได้เหมาะกับ scene",
      "บันทึกเสียง (on-camera หรือ external mic) ได้ชัดเจน",
      "ตัดต่อ pacing ตรงกับ mood และ brief",
      "ทำ color grade ได้ consistent ตลอดทั้งชิ้น",
      "ทำ sound design และ sync เสียงได้ดี",
      "ใส่ motion graphic หรือ text overlay ได้เหมาะสม",
      "export ไฟล์ได้ถูก spec ตามที่ client ต้องการ",
      "แก้ปัญหาเฉพาะหน้าในกองถ่ายหรือใน post ได้",
    ]),
    ...texts("hf_self_comp_text", ["เรียนรู้ tool หรือ technique ใหม่ที่นำมาใช้ในรอบนี้"]),
  ]),
  sec("teamwork", "Teamwork", C.team, "15%", rates("hf_self_team", "teamwork", [
    "ซัพพอร์ตทีมในกองถ่ายโดยไม่รอให้สั่ง",
    "สื่อสารกับสุไมยนาเรื่อง brief และ script ก่อนถ่าย",
    "แจ้ง Tarmisi ทันทีเมื่อมีปัญหาที่กระทบ deadline",
    "ทำงานร่วมกับ outsource ได้ราบรื่น",
  ])),
  sec("creativity", "Creativity", C.lead, "10%", [
    ...rates("hf_self_creativity", "creativity", [
      "นำเสนอ shot idea หรือ visual angle ใหม่ที่นอกเหนือ brief",
      "ริเริ่ม format หรือ style ใหม่ที่ยังไม่เคยทำ",
    ]),
    ...texts("hf_self_creativity_text", [
      "งานชิ้นที่ภูมิใจสุดในรอบนี้ (ลิงก์หรืออธิบาย)",
      "ไอเดีย visual ที่อยากลองในรอบถัดไป",
    ]),
  ]),
];

const HF_PEER: KPISection[] = [
  sec("teamwork", "Teamwork & Communication", C.team, "peer", [
    ...rates("hf_peer_team", "teamwork", [
      "ฮาฟีซสื่อสารเมื่อมีปัญหาหรือต้องการ clarify ก่อนถ่าย",
      "ฮาฟีซแจ้งเมื่อ shot หรืองานไม่ตรง brief ก่อนที่จะแก้ยาก",
      "ฮาฟีซพร้อมซัพพอร์ตเมื่อมีงานด่วนหรืองานนอกขอบเขต",
      "ฮาฟีซรับ feedback แล้วนำไปปรับงานได้จริง",
      "ฮาฟีซทำงานร่วมกับคนอื่นในทีมได้ดี",
      "งานของฮาฟีซตรงตามที่ brief ระบุไว้",
      "ฮาฟีซส่งงานตรงเวลาที่ตกลงกัน",
      "ไฟล์งานจัดระเบียบและตั้งชื่อถูกต้อง",
    ]),
    ...texts("hf_peer_text", ["สิ่งที่ฮาฟีซทำได้ดีมากในรอบนี้", "สิ่งที่อยากให้ฮาฟีซพัฒนาเพิ่มในรอบถัดไป"]),
  ]),
  sec("hidden", "ซ่อนจาก peer", "transparent", "hidden", [
    q("hf_peer_hidden_1", "Competency technical ทั้งหมด", "hidden"),
    q("hf_peer_hidden_2", "Creativity score", "hidden"),
  ]),
];

const HF_SUP: KPISection[] = [
  sec("auto_data", "Auto Data", C.auto, "read-only", [
    q("hf_sup_auto_1", "Task done ก่อน D-0 (%)", "auto", { autoId: "on_time_rate" }),
    q("hf_sup_auto_2", "Revision count เฉลี่ยต่อ task", "auto", { autoId: "avg_revision" }),
    q("hf_sup_auto_3", "จำนวน task รับผิดชอบในรอบ", "auto", { autoId: "total_tasks" }),
  ]),
  sec("job_performance", "Job Performance", C.job, "40%", rates("hf_sup_job", "job_performance", [
    "คุณภาพงานโดยรวมเทียบกับ brief",
    "ความรับผิดชอบต่ออุปกรณ์และไฟล์งาน",
    "ความตรงต่อเวลาในการส่งงาน",
    "ทำตาม production checklist ได้ครบ",
  ])),
  sec("competency", "Competency", C.comp, "35%", rates("hf_sup_comp", "competency", [
    "ระดับทักษะการถ่ายทำในรอบนี้",
    "ระดับทักษะการตัดต่อและ post production",
    "ทักษะ graphic และ motion design",
    "การแก้ปัญหาในกองถ่ายหรือ post",
    "พัฒนาจากรอบที่แล้วได้จริง (สังเกตได้)",
  ])),
  sec("teamwork", "Teamwork", C.team, "15%", rates("hf_sup_team", "teamwork", [
    "ซัพพอร์ตทีมโดยไม่ต้องรอให้สั่ง",
    "สื่อสารและประสานงานกับสุไมยนาก่อนถ่าย",
    "ทำงานกับ outsource ได้ราบรื่น",
  ])),
  sec("creativity", "Creativity", C.lead, "10%", [
    ...rates("hf_sup_creativity", "creativity", ["มี initiative นำเสนอ visual idea ใหม่"]),
    ...texts("hf_sup_creativity_text", ["เป้าหมายที่ต้องการเห็นในรอบถัดไป"]),
  ]),
];

const SY_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "35%", [
    q("sy_self_auto_1", "Script และ caption ที่ส่งตรงเวลาตาม production timeline", "auto", { autoId: "script_on_time" }),
    q("sy_self_auto_2", "จำนวน revision ที่ client ขอหลัง submit", "auto", { autoId: "client_revision_avg" }),
    ...rates("sy_self_job", "job_performance", [
      "สรุป client brief ให้ทีมได้ครบถ้วนก่อนเริ่มงาน",
      "จัดการ task และ to-do ของ coordinator role ได้ครบทุกโปรเจกต์",
      "ติดตาม client และ follow up งานได้ทันเวลา",
      "บันทึก meeting note และ change request จาก client ได้ครบ",
      "ประสานงาน timeline ระหว่าง client และทีมได้ smooth",
    ]),
  ]),
  sec("competency", "Competency", C.comp, "30%", [
    ...rates("sy_self_comp", "competency", [
      "เขียน script ที่อ่านแล้วเห็นภาพและ flow ดี",
      "เขียน caption ที่ตรง tone ของ brand client แต่ละเจ้า",
      "เขียน hook ที่ดึงดูดใน 3 วินาทีแรก",
      "ปรับ copy ให้เหมาะกับ platform (TikTok vs Instagram vs Facebook)",
      "เขียน content ภาษาไทยถูกต้องและอ่านลื่น",
      "เข้าใจ brand identity และ target audience ของ client แต่ละเจ้า",
      "เสนอ content angle ที่ตอบโจทย์ objective ของ client",
      "สื่อสารกับ client ได้ชัดเจนและมั่นใจ",
      "จัดการเมื่อ client เปลี่ยน direction กลางคันได้",
      "ติดตามเทรนด์ content และนำมาปรับใช้กับงาน client",
      "วิเคราะห์ผลลัพธ์ content (view, engagement) แล้วเสนอ insight",
    ]),
    ...texts("sy_self_comp_text", ["สิ่งที่เรียนรู้หรือพัฒนาได้ในรอบนี้"]),
  ]),
  sec("teamwork", "Teamwork", C.team, "25%", rates("sy_self_team", "teamwork", [
    "ส่ง brief ให้ฮาฟีซได้ครบก่อนเริ่มถ่ายทุกครั้ง",
    "แจ้ง Tarmisi เมื่อ client ขอ change ที่กระทบ scope",
    "แจ้งทีมเมื่อมีข้อมูลใหม่จาก client ที่กระทบ deadline",
    "ช่วยทีมเมื่อมีงานอื่นกระทบหรือมีคนขาด",
    "ทำงานกับ outsource ได้ราบรื่น",
  ])),
  sec("creativity", "Creativity", C.lead, "10%", [
    ...rates("sy_self_creativity", "creativity", [
      "นำเสนอ content format หรือ series idea ใหม่ที่ยังไม่เคยทำ",
      "เสนอ content angle ที่แตกต่างจาก brief เดิม",
    ]),
    ...texts("sy_self_creativity_text", [
      "content ชิ้นที่ภูมิใจสุดในรอบนี้ (ลิงก์หรืออธิบาย)",
      "ไอเดีย content ที่อยากลองในรอบถัดไป",
    ]),
  ]),
];

const SY_PEER: KPISection[] = [
  sec("coordination", "Communication & Coordination", C.team, "peer", [
    ...rates("sy_peer_coord", "teamwork", [
      "สุไมยนาส่ง brief ให้ทีมชัดเจนและครบก่อนเริ่มถ่ายทุกครั้ง",
      "สุไมยนาระบุ deadline และ priority ของงานให้ชัดเจน",
      "สุไมยนาแจ้ง change จาก client ให้ทีมทราบทันเวลา",
      "สุไมยนาเป็น buffer ที่ดีระหว่าง client กับทีม",
      "สุไมยนา follow up งานและไม่ปล่อยให้หาย",
      "สุไมยนาช่วยทีมเมื่อมีปัญหาเฉพาะหน้า",
      "สุไมยนารับ feedback และนำไปปรับได้จริง",
      "สุไมยนาทำงานร่วมกับทีมได้ราบรื่น ไม่สร้าง friction",
    ]),
    ...texts("sy_peer_text", ["สิ่งที่สุไมยนาทำได้ดีมากในรอบนี้", "สิ่งที่อยากให้สุไมยนาพัฒนาเพิ่มในรอบถัดไป"]),
  ]),
  sec("hidden", "ซ่อนจาก peer", "transparent", "hidden", [
    q("sy_peer_hidden_1", "Competency การเขียน script/caption ทั้งหมด", "hidden"),
    q("sy_peer_hidden_2", "Creativity score", "hidden"),
  ]),
];

const SY_SUP: KPISection[] = [
  sec("auto_data", "Auto Data", C.auto, "read-only", [
    q("sy_sup_auto_1", "Script/caption on-time (%)", "auto", { autoId: "script_on_time" }),
    q("sy_sup_auto_2", "Client revision เฉลี่ยต่อโปรเจกต์", "auto", { autoId: "client_revision_avg" }),
    q("sy_sup_auto_3", "จำนวน client ที่ดูแลในรอบ", "auto", { autoId: "total_clients" }),
  ]),
  sec("job_performance", "Job Performance", C.job, "35%", rates("sy_sup_job", "job_performance", [
    "คุณภาพ brief ที่ส่งต่อให้ทีมก่อนถ่าย",
    "การติดตาม client และ follow up งาน",
    "บันทึก change request และ meeting note ได้ครบ",
    "ประสานงาน timeline ระหว่าง client และทีม",
  ])),
  sec("competency", "Competency", C.comp, "30%", rates("sy_sup_comp", "competency", [
    "ระดับทักษะการเขียน script/caption",
    "เข้าใจ brand และ target audience ของ client",
    "สื่อสารและจัดการ client ได้มืออาชีพ",
    "เสนอ content strategy ที่ตอบโจทย์ objective จริง",
    "พัฒนาจากรอบที่แล้ว (สังเกตได้จริง)",
  ])),
  sec("teamwork", "Teamwork", C.team, "25%", rates("sy_sup_team", "teamwork", [
    "ทำหน้าที่ coordinator ได้ smooth ไม่ให้ทีมรอข้อมูล",
    "แจ้ง Tarmisi เมื่อมี scope change จาก client",
    "ทำงานกับ outsource ได้ราบรื่น",
  ])),
  sec("creativity", "Creativity", C.lead, "10%", [
    ...rates("sy_sup_creativity", "creativity", [
      "มี initiative นำเสนอ content idea ใหม่",
      "ริเริ่ม format หรือ series ที่ทำให้งานโดดเด่น",
    ]),
    ...texts("sy_sup_creativity_text", ["เป้าหมายที่ต้องการเห็นในรอบถัดไป"]),
  ]),
];

const OS_SELF: KPISection[] = [
  sec("job_performance", "Job Performance", C.job, "45%", [
    q("os_self_auto_1", "ส่งงานตรงตาม deadline ที่ตกลงกัน", "auto", { autoId: "on_time_rate" }),
    q("os_self_auto_2", "จำนวน revision หลังส่งงาน", "auto", { autoId: "avg_revision" }),
    ...rates("os_self_job", "job_performance", [
      "งานตรงตาม brief ที่ได้รับ",
      "ความรับผิดชอบต่อไฟล์งานและ asset ที่ได้รับ",
    ]),
  ]),
  sec("competency", "Competency", C.comp, "40%", [
    ...rates("os_self_comp", "competency", [
      "ทักษะเฉพาะทางที่ได้รับมอบหมายในโปรเจกต์นี้",
      "แก้ปัญหาได้โดยไม่ต้องรอให้ทีม WatSUB! ช่วย",
      "สื่อสารเมื่อมีปัญหาหรือต้องการ clarify brief",
      "คุณภาพงานเทียบกับมาตรฐานที่ตกลงไว้ตั้งแต่ต้น",
    ]),
    ...texts("os_self_comp_text", ["สิ่งที่พัฒนาหรือเรียนรู้จากโปรเจกต์นี้"]),
  ]),
  sec("collaboration", "Collaboration", C.team, "15%", [
    ...rates("os_self_collab", "collaboration", [
      "ทำงานร่วมกับทีม WatSUB! ได้ราบรื่น",
      "ตอบสนองต่อ feedback ได้เร็วและตรงประเด็น",
    ]),
    ...texts("os_self_collab_text", [
      "ผลงานที่ภูมิใจสุดในโปรเจกต์นี้ (ลิงก์หรืออธิบาย)",
    ]),
  ]),
];

const OS_PEER: KPISection[] = [
  sec("collaboration", "Collaboration", C.team, "peer", [
    ...rates("os_peer_collab", "collaboration", [
      "ส่งงานตรงเวลาที่ตกลงกัน",
      "งานตรง brief ไม่ต้องอธิบายซ้ำ",
      "สื่อสารและตอบกลับได้ทันเวลา",
      "รับ feedback และปรับงานได้ดี",
    ]),
    ...texts("os_peer_text", ["สิ่งที่ทำได้ดีในโปรเจกต์นี้", "สิ่งที่ควรปรับสำหรับโปรเจกต์ถัดไป"]),
  ]),
];

const OS_SUP: KPISection[] = [
  sec("auto_data", "Auto Data", C.auto, "read-only", [
    q("os_sup_auto_1", "Task done ก่อน deadline (%)", "auto", { autoId: "on_time_rate" }),
    q("os_sup_auto_2", "Revision count รวมทั้งโปรเจกต์", "auto", { autoId: "avg_revision" }),
    q("os_sup_auto_3", "จำนวน project ที่ร่วมในรอบ", "auto", { autoId: "closed_projects" }),
  ]),
  sec("job_performance", "Job Performance", C.job, "45%", rates("os_sup_job", "job_performance", [
    "คุณภาพงานโดยรวมเทียบ brief",
    "ความรับผิดชอบและ reliability",
    "ส่งงานตรงเวลาและแจ้งล่วงหน้าเมื่อมีปัญหา",
  ])),
  sec("competency", "Competency", C.comp, "40%", rates("os_sup_comp", "competency", [
    "ทักษะเฉพาะทางในงานที่ได้รับ",
    "พัฒนาจากโปรเจกต์ที่แล้ว",
  ])),
  sec("collaboration", "Collaboration", C.team, "15%", [
    ...rates("os_sup_collab", "collaboration", [
      "ทำงานกับทีมได้ smooth ไม่กินเวลา",
      "อยากทำงานด้วยในโปรเจกต์ถัดไป",
    ]),
    ...texts("os_sup_collab_text", ["เป้าหมายหรือ feedback สำหรับโปรเจกต์ถัดไป"]),
  ]),
];

const DEFAULT_CONFIG: Record<ReviewerType, KPIFormConfig> = {
  self: { note: "แบบประเมินตนเองทั่วไป", sections: [sec("job_performance", "Job Performance", C.job, "100%", [q("df_self_1", "คุณภาพงานโดยรวม", "rate", { scoreKey: "quality" })])] },
  peer: { note: "แบบประเมิน peer ทั่วไป", sections: [sec("teamwork", "Teamwork", C.team, "100%", [q("df_peer_1", "การทำงานร่วมกัน", "rate", { scoreKey: "communication" })])] },
  supervisor: { note: "แบบประเมิน supervisor ทั่วไป", sections: [sec("auto_data", "Auto Data", C.auto, "100%", [q("df_sup_1", "งานที่ส่งตรงเวลา", "auto", { autoId: "on_time_rate" })])] },
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
  outsource: {
    self: { note: "Outsource self evaluation", sections: OS_SELF },
    peer: { note: "ทีม WatSUB ประเมิน outsource", sections: OS_PEER },
    supervisor: { note: "Director supervisor review for outsource", sections: OS_SUP },
  },
  default: DEFAULT_CONFIG,
};
