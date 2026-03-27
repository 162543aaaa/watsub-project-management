import type { KpiSubScoreKey } from "@/hooks/useKpi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoleKey = "ta" | "hafeez" | "sumayna";
export type ReviewerType = "self" | "peer" | "supervisor";
export type QuestionType = "auto" | "rate" | "text" | "hidden";

export interface KPIQuestion {
  id: string;
  labelTh: string;
  type: QuestionType;
  /** For 'rate' questions — which score key this maps to */
  scoreKey?: KpiSubScoreKey;
  /** For 'auto' questions — which computed value to display */
  autoId?: AutoValueId;
}

export interface KPISection {
  key: string;
  labelTh: string;
  color: string;
  questions: KPIQuestion[];
}

export interface KPIFormConfig {
  /** Override the reviewer type label shown in the header badge */
  uiLabel?: string;
  sections: KPISection[];
}

// ─── Auto value IDs ───────────────────────────────────────────────────────────
// Computed from task DB at runtime via getAutoDisplayValue()

export type AutoValueId =
  | "tasks_ontime_pct"     // % tasks completed before due date
  | "tasks_done_count"     // total tasks with status Done
  | "revision_avg"         // avg revisions per task (from comments)
  | "projects_closed"      // count of closed projects
  | "scripts_ontime_pct"   // % of script/caption tasks on time (sumayna)
  | "client_count"         // distinct clients managed
  | "task_approve_d1";     // tasks with approval within D-1 (%)

// ─── Weights ──────────────────────────────────────────────────────────────────

/** Section weights per role */
export const ROLE_WEIGHTS: Record<RoleKey, Record<string, number>> = {
  ta:      { job_performance: 20, competency: 20, teamwork: 20, leadership: 40 },
  hafeez:  { job_performance: 40, competency: 35, teamwork: 15, leadership: 10 },
  sumayna: { job_performance: 35, competency: 30, teamwork: 25, leadership: 10 },
};

/** Reviewer contribution weights for final score */
export const REVIEWER_WEIGHTS = { auto: 0.30, self: 0.10, peer: 0.20, supervisor: 0.40 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveRoleKey(name: string): RoleKey | null {
  const n = name.toLowerCase().trim();
  if (n === "ta" || n.startsWith("ta ") || n.endsWith(" ta")) return "ta";
  if (n.includes("hafeez")) return "hafeez";
  if (n.includes("sumayna")) return "sumayna";
  return null;
}

// ─── 9 Form Configs ───────────────────────────────────────────────────────────

export const KPI_QUESTIONS: Record<RoleKey, Record<ReviewerType, KPIFormConfig>> = {

  // ────────────────────────── ต้า (Director) ──────────────────────────────────

  ta: {

    self: {
      sections: [
        {
          key: "job_performance", labelTh: "ผลการปฏิบัติงาน", color: "hsl(191 91% 37%)",
          questions: [
            { id: "ta_self_j1", labelTh: "คุณภาพของ direction/concept ที่มอบให้ทีม", type: "rate", scoreKey: "quality" },
            { id: "ta_self_j2", labelTh: "จำนวนโปรเจกต์ที่ปิดได้ในรอบ (ข้อมูลจากระบบ)", type: "auto", autoId: "projects_closed" },
            { id: "ta_self_j3", labelTh: "ส่ง feedback/approval ให้ทีมทัน D-3 ถึง D-0", type: "rate", scoreKey: "punctuality" },
            { id: "ta_self_j4", labelTh: "ความถูกต้องของงบประมาณที่ตัดสินใจและรับผิดชอบ", type: "rate", scoreKey: "accountability" },
          ],
        },
        {
          key: "competency", labelTh: "ความสามารถ / ทักษะ", color: "hsl(262 83% 58%)",
          questions: [
            { id: "ta_self_c1", labelTh: "การวิเคราะห์และตัดสินใจเชิงธุรกิจ", type: "rate", scoreKey: "problem_solving" },
            { id: "ta_self_c2", labelTh: "การบริหารความเสี่ยงในโปรเจกต์", type: "rate", scoreKey: "technical" },
            { id: "ta_self_c3", labelTh: "ความคิดสร้างสรรค์ในการพัฒนา creative direction", type: "rate", scoreKey: "creativity" },
            { id: "ta_self_c4", labelTh: "การติดตามเทรนด์ (AI, creative economy, platform)", type: "rate", scoreKey: "learning" },
          ],
        },
        {
          key: "teamwork", labelTh: "การทำงานเป็นทีม", color: "hsl(142 71% 45%)",
          questions: [
            { id: "ta_self_t1", labelTh: "ความชัดเจนของ brief ที่มอบให้ทีม", type: "rate", scoreKey: "communication" },
            { id: "ta_self_t2", labelTh: "การรับฟัง feedback จากทีมและ client", type: "rate", scoreKey: "openness" },
            { id: "ta_self_t3", labelTh: "การสนับสนุนและช่วยเหลือทีม", type: "rate", scoreKey: "support" },
            { id: "ta_self_t4", labelTh: "การสร้างบรรยากาศที่ทีมทำงานสบายใจ", type: "rate", scoreKey: "collaboration" },
          ],
        },
        {
          key: "leadership", labelTh: "ภาวะผู้นำ / ธุรกิจ", color: "hsl(38 92% 50%)",
          questions: [
            { id: "ta_self_l1", labelTh: "ทิศทาง WatSUB! ชัดเจนและสื่อสารให้ทีมเข้าใจ", type: "rate", scoreKey: "strategic" },
            { id: "ta_self_l2", labelTh: "การสร้างและรักษาความสัมพันธ์กับ partner/client", type: "rate", scoreKey: "presentation" },
            { id: "ta_self_l3", labelTh: "การตัดสินใจที่ชัดเจนเมื่อทีมต้องการทิศทาง", type: "rate", scoreKey: "decision_making" },
            { id: "ta_self_l4", labelTh: "การพัฒนาระบบภายใน (PM, SOP, cashflow)", type: "rate", scoreKey: "management" },
            { id: "ta_self_l5", labelTh: "เป้าหมายที่ต้องการพัฒนาในรอบถัดไป", type: "text" },
          ],
        },
      ],
    },

    peer: {
      sections: [
        {
          key: "teamwork", labelTh: "การทำงานร่วมกัน", color: "hsl(142 71% 45%)",
          questions: [
            { id: "ta_peer_t1", labelTh: "ต้า brief งานชัดเจนและนำไปใช้ได้ทันที", type: "rate", scoreKey: "communication" },
            { id: "ta_peer_t2", labelTh: "ต้าตอบสนองต่อคำถาม / ปัญหาของทีมได้ทันเวลา", type: "rate", scoreKey: "support" },
            { id: "ta_peer_t3", labelTh: "ต้า approve / reject งานพร้อม reason ที่ชัดเจน", type: "rate", scoreKey: "openness" },
            { id: "ta_peer_t4", labelTh: "ต้ารับฟังเมื่อทีมเสนอ idea หรือปัญหา", type: "rate", scoreKey: "collaboration" },
          ],
        },
        {
          key: "leadership_peer", labelTh: "การนำทีม", color: "hsl(38 92% 50%)",
          questions: [
            { id: "ta_peer_l1", labelTh: "รู้สึกว่าต้ามีทิศทางที่ชัดเจนสำหรับสตูดิโอ", type: "rate", scoreKey: "strategic" },
            { id: "ta_peer_l2", labelTh: "สิ่งที่ต้าทำได้ดีในการนำทีมรอบนี้", type: "text" },
            { id: "ta_peer_l3", labelTh: "สิ่งที่อยากให้ต้าปรับปรุงหรือพัฒนา", type: "text" },
          ],
        },
      ],
    },

    supervisor: {
      uiLabel: "Self-Reflection",
      sections: [
        {
          key: "auto_data", labelTh: "ข้อมูลจากระบบ (อ้างอิง)", color: "hsl(215 14% 50%)",
          questions: [
            { id: "ta_sup_a1", labelTh: "จำนวนโปรเจกต์ที่ close ในรอบ", type: "auto", autoId: "projects_closed" },
            { id: "ta_sup_a2", labelTh: "Task ที่ approve ภายใน D-1 (%)", type: "auto", autoId: "task_approve_d1" },
            { id: "ta_sup_a3", labelTh: "งานที่ส่งตรงเวลา (%)", type: "auto", autoId: "tasks_ontime_pct" },
          ],
        },
        {
          key: "strategic_reflection", labelTh: "Strategic Self-Reflection", color: "hsl(38 92% 50%)",
          questions: [
            { id: "ta_sup_s1", labelTh: "เป้าหมาย Q ที่ตั้งไว้ vs ผลที่ทำได้จริงในรอบนี้", type: "text" },
            { id: "ta_sup_s2", labelTh: "ความท้าทายใหญ่สุดในรอบนี้และจัดการอย่างไร", type: "text" },
            { id: "ta_sup_s3", labelTh: "สิ่งที่จะทำต่างออกไปในรอบถัดไป", type: "text" },
          ],
        },
      ],
    },

  },

  // ─────────────────────────── ฮาฟีซ (Production) ────────────────────────────

  hafeez: {

    self: {
      sections: [
        {
          key: "job_performance", labelTh: "ผลการปฏิบัติงาน", color: "hsl(191 91% 37%)",
          questions: [
            { id: "hf_self_j1", labelTh: "Task ที่ submit ก่อน D-0 (ข้อมูลจากระบบ)", type: "auto", autoId: "tasks_ontime_pct" },
            { id: "hf_self_j2", labelTh: "จำนวน revision หลัง waiting-approval (ข้อมูลจากระบบ)", type: "auto", autoId: "revision_avg" },
            { id: "hf_self_j3", labelTh: "ความพิถีพิถันในการจัดไฟล์ตาม naming convention", type: "rate", scoreKey: "quality" },
            { id: "hf_self_j4", labelTh: "การดูแลอุปกรณ์กล้องและ hard drive", type: "rate", scoreKey: "accountability" },
          ],
        },
        {
          key: "competency", labelTh: "ความสามารถ / ทักษะ", color: "hsl(262 83% 58%)",
          questions: [
            { id: "hf_self_c1", labelTh: "ทักษะการถ่ายทำ (exposure, framing, movement)", type: "rate", scoreKey: "technical" },
            { id: "hf_self_c2", labelTh: "ทักษะการตัดต่อ (pacing, color grade, sound sync)", type: "rate", scoreKey: "problem_solving" },
            { id: "hf_self_c3", labelTh: "ทักษะ graphic / motion design", type: "rate", scoreKey: "creativity" },
            { id: "hf_self_c4", labelTh: "การแก้ปัญหาเฉพาะหน้าในกองถ่าย", type: "rate", scoreKey: "learning" },
            { id: "hf_self_c5", labelTh: "การเรียนรู้ tool หรือ technique ใหม่ในรอบนี้ (อธิบาย)", type: "text" },
          ],
        },
        {
          key: "teamwork", labelTh: "การทำงานเป็นทีม", color: "hsl(142 71% 45%)",
          questions: [
            { id: "hf_self_t1", labelTh: "การซัพพอร์ตทีมในกองถ่าย", type: "rate", scoreKey: "support" },
            { id: "hf_self_t2", labelTh: "การสื่อสารเมื่อมีปัญหาหรือ delay", type: "rate", scoreKey: "communication" },
          ],
        },
        {
          key: "creativity", labelTh: "Creativity & Initiative", color: "hsl(38 92% 50%)",
          questions: [
            { id: "hf_self_cr1", labelTh: "นำเสนอ shot / visual idea ใหม่นอกเหนือ brief", type: "rate", scoreKey: "collaboration" },
            { id: "hf_self_cr2", labelTh: "ผลงานชิ้นที่ภูมิใจสุดในรอบนี้ (ลิงก์หรืออธิบาย)", type: "text" },
          ],
        },
      ],
    },

    peer: {
      sections: [
        {
          key: "teamwork_comm", labelTh: "การสื่อสารและทีมเวิร์ค", color: "hsl(142 71% 45%)",
          questions: [
            { id: "hf_peer_t1", labelTh: "ฮาฟีซสื่อสารเมื่อมีปัญหาหรือต้องการความช่วยเหลือ", type: "rate", scoreKey: "communication" },
            { id: "hf_peer_t2", labelTh: "ฮาฟีซพร้อมซัพพอร์ตเมื่อมีงานด่วน", type: "rate", scoreKey: "support" },
            { id: "hf_peer_t3", labelTh: "ฮาฟีซรับ feedback และนำไปปรับงานได้", type: "rate", scoreKey: "openness" },
          ],
        },
        {
          key: "job_peer", labelTh: "ผลงาน", color: "hsl(191 91% 37%)",
          questions: [
            { id: "hf_peer_j1", labelTh: "งานของฮาฟีซตรงตามที่ brief ไว้", type: "rate", scoreKey: "quality" },
            { id: "hf_peer_j2", labelTh: "ฮาฟีซส่งงานตรงเวลาที่ตกลงกัน", type: "rate", scoreKey: "punctuality" },
            { id: "hf_peer_j3", labelTh: "สิ่งที่ฮาฟีซทำได้ดีมากในรอบนี้", type: "text" },
            { id: "hf_peer_j4", labelTh: "สิ่งที่อยากให้ฮาฟีซพัฒนาเพิ่ม", type: "text" },
          ],
        },
        { key: "hidden_competency", labelTh: "ซ่อน", color: "transparent",
          questions: [
            { id: "hf_peer_h1", labelTh: "Competency technical", type: "hidden" },
            { id: "hf_peer_h2", labelTh: "Creativity score", type: "hidden" },
          ],
        },
      ],
    },

    supervisor: {
      sections: [
        {
          key: "auto_data", labelTh: "ข้อมูลจากระบบ (อ้างอิง)", color: "hsl(215 14% 50%)",
          questions: [
            { id: "hf_sup_a1", labelTh: "Task done ก่อน D-0 (%)", type: "auto", autoId: "tasks_ontime_pct" },
            { id: "hf_sup_a2", labelTh: "Revision count เฉลี่ยต่อ task", type: "auto", autoId: "revision_avg" },
            { id: "hf_sup_a3", labelTh: "จำนวน task รับผิดชอบในรอบ", type: "auto", autoId: "tasks_done_count" },
          ],
        },
        {
          key: "job_performance", labelTh: "ผลการปฏิบัติงาน", color: "hsl(191 91% 37%)",
          questions: [
            { id: "hf_sup_j1", labelTh: "คุณภาพงานโดยรวมเทียบกับ brief", type: "rate", scoreKey: "quality" },
            { id: "hf_sup_j2", labelTh: "ความรับผิดชอบต่ออุปกรณ์และไฟล์งาน", type: "rate", scoreKey: "accountability" },
          ],
        },
        {
          key: "competency", labelTh: "ความสามารถ / ทักษะ", color: "hsl(262 83% 58%)",
          questions: [
            { id: "hf_sup_c1", labelTh: "ระดับทักษะการถ่ายทำในรอบนี้", type: "rate", scoreKey: "technical" },
            { id: "hf_sup_c2", labelTh: "ระดับทักษะการตัดต่อ / graphic", type: "rate", scoreKey: "problem_solving" },
            { id: "hf_sup_c3", labelTh: "การพัฒนาฝีมือจากรอบที่แล้ว", type: "rate", scoreKey: "learning" },
          ],
        },
        {
          key: "creativity_growth", labelTh: "Creativity & Growth", color: "hsl(38 92% 50%)",
          questions: [
            { id: "hf_sup_cr1", labelTh: "มี initiative ในงาน creative นอกเหนือ brief", type: "rate", scoreKey: "creativity" },
            { id: "hf_sup_cr2", labelTh: "เป้าหมายที่ต้องการเห็นในรอบถัดไป", type: "text" },
          ],
        },
      ],
    },

  },

  // ─────────────────────────── สุไมยนา (Strategy) ─────────────────────────────

  sumayna: {

    self: {
      sections: [
        {
          key: "job_performance", labelTh: "ผลการปฏิบัติงาน", color: "hsl(191 91% 37%)",
          questions: [
            { id: "sy_self_j1", labelTh: "Script / caption ที่ส่งตรง production timeline (%)", type: "auto", autoId: "scripts_ontime_pct" },
            { id: "sy_self_j2", labelTh: "จำนวน revision ที่ client ขอหลัง submit", type: "auto", autoId: "revision_avg" },
            { id: "sy_self_j3", labelTh: "ความครบถ้วนของ client brief ที่รับมาและสรุปให้ทีม", type: "rate", scoreKey: "quality" },
            { id: "sy_self_j4", labelTh: "การจัดการ task coordinator ในแต่ละโปรเจกต์", type: "rate", scoreKey: "accountability" },
          ],
        },
        {
          key: "competency", labelTh: "ความสามารถ / ทักษะ", color: "hsl(262 83% 58%)",
          questions: [
            { id: "sy_self_c1", labelTh: "คุณภาพการเขียน script / caption (tone, clarity)", type: "rate", scoreKey: "technical" },
            { id: "sy_self_c2", labelTh: "ความเข้าใจ brand ของ client แต่ละเจ้า", type: "rate", scoreKey: "problem_solving" },
            { id: "sy_self_c3", labelTh: "การสื่อสารกับ client (ความมั่นใจ, ความชัดเจน)", type: "rate", scoreKey: "learning" },
            { id: "sy_self_c4", labelTh: "การติดตามเทรนด์ content ที่เกี่ยวข้อง", type: "rate", scoreKey: "creativity" },
            { id: "sy_self_c5", labelTh: "สิ่งที่เรียนรู้หรือพัฒนาได้ในรอบนี้", type: "text" },
          ],
        },
        {
          key: "teamwork", labelTh: "การทำงานเป็นทีม", color: "hsl(142 71% 45%)",
          questions: [
            { id: "sy_self_t1", labelTh: "การส่งต่อ brief ให้ฮาฟีซครบและชัดเจน", type: "rate", scoreKey: "communication" },
            { id: "sy_self_t2", labelTh: "การแจ้ง update / change จาก client ให้ทีมทันเวลา", type: "rate", scoreKey: "support" },
            { id: "sy_self_t3", labelTh: "การช่วยทีมเมื่อมีงานอื่นกระทบ", type: "rate", scoreKey: "collaboration" },
          ],
        },
        {
          key: "creativity", labelTh: "Creativity & Initiative", color: "hsl(38 92% 50%)",
          questions: [
            { id: "sy_self_cr1", labelTh: "นำเสนอ content angle หรือ format ใหม่ในรอบนี้", type: "rate", scoreKey: "openness" },
            { id: "sy_self_cr2", labelTh: "Content ชิ้นที่ภูมิใจสุด (ลิงก์หรืออธิบาย)", type: "text" },
          ],
        },
      ],
    },

    peer: {
      sections: [
        {
          key: "comm_coord", labelTh: "การประสานงานและสื่อสาร", color: "hsl(142 71% 45%)",
          questions: [
            { id: "sy_peer_c1", labelTh: "สุไมยนาส่ง brief ให้ทีมชัดเจนและครบก่อนเริ่มถ่าย", type: "rate", scoreKey: "communication" },
            { id: "sy_peer_c2", labelTh: "สุไมยนาแจ้ง change จาก client ได้ทันเวลา", type: "rate", scoreKey: "support" },
            { id: "sy_peer_c3", labelTh: "สุไมยนาเป็น buffer ที่ดีระหว่าง client กับทีม", type: "rate", scoreKey: "collaboration" },
          ],
        },
        {
          key: "teamwork_peer", labelTh: "ทีมเวิร์ค", color: "hsl(191 91% 37%)",
          questions: [
            { id: "sy_peer_t1", labelTh: "สุไมยนาช่วยทีมเมื่อมีปัญหาเฉพาะหน้า", type: "rate", scoreKey: "openness" },
            { id: "sy_peer_t2", labelTh: "สุไมยนารับ feedback และนำไปปรับได้", type: "rate", scoreKey: "quality" },
            { id: "sy_peer_t3", labelTh: "สิ่งที่สุไมยนาทำได้ดีมากในรอบนี้", type: "text" },
            { id: "sy_peer_t4", labelTh: "สิ่งที่อยากให้สุไมยนาพัฒนาเพิ่ม", type: "text" },
          ],
        },
        {
          key: "hidden_writing", labelTh: "ซ่อน", color: "transparent",
          questions: [
            { id: "sy_peer_h1", labelTh: "Competency การเขียน", type: "hidden" },
            { id: "sy_peer_h2", labelTh: "Creativity score", type: "hidden" },
          ],
        },
      ],
    },

    supervisor: {
      sections: [
        {
          key: "auto_data", labelTh: "ข้อมูลจากระบบ (อ้างอิง)", color: "hsl(215 14% 50%)",
          questions: [
            { id: "sy_sup_a1", labelTh: "Script / caption ที่ on-time (%)", type: "auto", autoId: "scripts_ontime_pct" },
            { id: "sy_sup_a2", labelTh: "Revision จาก client เฉลี่ยต่อชิ้น", type: "auto", autoId: "revision_avg" },
            { id: "sy_sup_a3", labelTh: "จำนวน client ที่ดูแลในรอบ", type: "auto", autoId: "client_count" },
          ],
        },
        {
          key: "job_performance", labelTh: "ผลการปฏิบัติงาน", color: "hsl(191 91% 37%)",
          questions: [
            { id: "sy_sup_j1", labelTh: "คุณภาพ brief ที่ส่งต่อให้ทีม", type: "rate", scoreKey: "quality" },
            { id: "sy_sup_j2", labelTh: "การจัดการ client relationship โดยรวม", type: "rate", scoreKey: "accountability" },
          ],
        },
        {
          key: "competency", labelTh: "ความสามารถ / ทักษะ", color: "hsl(262 83% 58%)",
          questions: [
            { id: "sy_sup_c1", labelTh: "ระดับทักษะการเขียน script / caption", type: "rate", scoreKey: "technical" },
            { id: "sy_sup_c2", labelTh: "ความเข้าใจ brand และ target audience ของ client", type: "rate", scoreKey: "problem_solving" },
            { id: "sy_sup_c3", labelTh: "การพัฒนาจากรอบที่แล้ว", type: "rate", scoreKey: "learning" },
          ],
        },
        {
          key: "teamwork_creativity", labelTh: "ทีมเวิร์คและ Initiative", color: "hsl(38 92% 50%)",
          questions: [
            { id: "sy_sup_tc1", labelTh: "ทำหน้าที่ coordinator ได้ smooth", type: "rate", scoreKey: "collaboration" },
            { id: "sy_sup_tc2", labelTh: "มี initiative ในงาน content strategy", type: "rate", scoreKey: "creativity" },
            { id: "sy_sup_tc3", labelTh: "เป้าหมายที่ต้องการเห็นในรอบถัดไป", type: "text" },
          ],
        },
      ],
    },

  },
};
