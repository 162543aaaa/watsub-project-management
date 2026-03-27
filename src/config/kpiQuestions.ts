// ─── KPI Questions Config ────────────────────────────────────────────────────
// 3 roles × 3 reviewer types = 9 form configurations
// Roles: ta | hafeez | sumayna
// Reviewer types: self | peer | supervisor

export type RoleKey = "ta" | "hafeez" | "sumayna";
export type ReviewerType = "self" | "peer" | "supervisor";
export type QuestionType = "auto" | "rate" | "text" | "hidden";

export interface KPIQuestion {
  id: string;
  labelTh: string;
  desc: string;
  type: QuestionType;
  /** maps to a KpiSubScoreKey for scoring (only for rate questions) */
  scoreKey?: string;
}

export interface KPISection {
  key: string;
  labelTh: string;
  labelEn: string;
  /** relative weight of this section within this role (0–100, sum = 100) */
  weight: number;
  color: string;
  questions: KPIQuestion[];
}

export interface KPIFormConfig {
  sections: KPISection[];
}

// ─── Role → section weight maps ───────────────────────────────────────────────
// Weights: job_performance / competency / teamwork / leadership / creativity

export const ROLE_SECTION_WEIGHTS: Record<RoleKey, Record<string, number>> = {
  ta: {
    job_performance: 20,
    competency: 20,
    teamwork: 20,
    leadership: 40,
    creativity: 0,
  },
  hafeez: {
    job_performance: 40,
    competency: 35,
    teamwork: 15,
    leadership: 10,
    creativity: 10,
  },
  sumayna: {
    job_performance: 35,
    competency: 30,
    teamwork: 25,
    leadership: 0,
    creativity: 10,
  },
};

// ─── Reviewer weights (auto / self / peer / supervisor) ──────────────────────
export const REVIEWER_WEIGHTS = {
  auto: 0.30,
  self: 0.10,
  peer: 0.20,
  supervisor: 0.40,
};

// ─── Employee name → role key mapping ────────────────────────────────────────
/** Match an employee name (case-insensitive) to a RoleKey */
export function resolveRoleKey(employeeName: string): RoleKey | null {
  const n = employeeName.toLowerCase().trim();
  if (n === "ta" || n.startsWith("ta ") || n.endsWith(" ta")) return "ta";
  if (n.includes("hafeez")) return "hafeez";
  if (n.includes("sumayna")) return "sumayna";
  return null;
}

// ─── Auto question IDs and their computation keys ────────────────────────────
export type AutoQuestionId =
  | "auto_on_time_rate"
  | "auto_quality_rate"
  | "auto_task_count"
  | "auto_script_on_time";

// ─── Section definitions (shared base, varied per form) ───────────────────────

const jpQuestions = {
  quality: {
    id: "q_quality", labelTh: "คุณภาพงาน",
    desc: "งานตัดต่อ / กราฟิกได้มาตรฐานตามบรีฟ", type: "rate" as QuestionType, scoreKey: "quality",
  },
  quantity: {
    id: "q_quantity", labelTh: "ปริมาณงาน",
    desc: "จัดการจำนวนโปรเจกต์ได้ตามเป้าหมาย", type: "rate" as QuestionType, scoreKey: "quantity",
  },
  punctuality: {
    id: "q_punctuality", labelTh: "การตรงต่อเวลา",
    desc: "ส่งงานตามตาราง Production Timeline", type: "rate" as QuestionType, scoreKey: "punctuality",
  },
  accountability: {
    id: "q_accountability", labelTh: "ความรับผิดชอบ",
    desc: "การดูแลอุปกรณ์และการจัดการไฟล์งาน", type: "rate" as QuestionType, scoreKey: "accountability",
  },
  autoOnTime: {
    id: "auto_on_time_rate", labelTh: "อัตราส่งงานตรงเวลา (ระบบ)",
    desc: "คำนวณจากงานที่เสร็จก่อน due date", type: "auto" as QuestionType,
  },
  autoQuality: {
    id: "auto_quality_rate", labelTh: "อัตราผ่านรอบแรก (ระบบ)",
    desc: "งานที่ไม่มี revision / แก้ไข", type: "auto" as QuestionType,
  },
  autoTaskCount: {
    id: "auto_task_count", labelTh: "จำนวนงานที่เสร็จ (ระบบ)",
    desc: "นับจาก tasks ที่มีสถานะ Done", type: "auto" as QuestionType,
  },
};

const compQuestions = {
  technical: {
    id: "q_technical", labelTh: "ทักษะเฉพาะทาง",
    desc: "การใช้กล้อง, โปรแกรมตัดต่อ, การเขียนสคริปต์", type: "rate" as QuestionType, scoreKey: "technical",
  },
  problem_solving: {
    id: "q_problem_solving", labelTh: "การแก้ปัญหา",
    desc: "การจัดการปัญหาเฉพาะหน้าในกองถ่ายหรือกับลูกค้า", type: "rate" as QuestionType, scoreKey: "problem_solving",
  },
  creativity: {
    id: "q_creativity", labelTh: "ความคิดสร้างสรรค์",
    desc: "การนำเสนอไอเดียคอนเทนต์ใหม่ๆ", type: "rate" as QuestionType, scoreKey: "creativity",
  },
  learning: {
    id: "q_learning", labelTh: "การเรียนรู้",
    desc: "การอัปเดตเทรนด์วิดีโอหรือเครื่องมือ AI ใหม่ๆ", type: "rate" as QuestionType, scoreKey: "learning",
  },
};

const twQuestions = {
  communication: {
    id: "q_communication", labelTh: "การสื่อสาร",
    desc: "การประสานงานระหว่างลูกค้าและทีมภายใน", type: "rate" as QuestionType, scoreKey: "communication",
  },
  support: {
    id: "q_support", labelTh: "การช่วยเหลือ",
    desc: "การซัพพอร์ตเพื่อนร่วมทีมในกองถ่าย", type: "rate" as QuestionType, scoreKey: "support",
  },
  openness: {
    id: "q_openness", labelTh: "การรับฟัง",
    desc: "การยอมรับคำวิจารณ์งานจากลูกค้า / หัวหน้า", type: "rate" as QuestionType, scoreKey: "openness",
  },
  collaboration: {
    id: "q_collaboration", labelTh: "ความร่วมมือ",
    desc: "ทำงานร่วมกันเพื่อให้ได้วิสัยทัศน์ตามที่ลูกค้าต้องการ", type: "rate" as QuestionType, scoreKey: "collaboration",
  },
};

const ldQuestions = {
  presentation: {
    id: "q_presentation", labelTh: "การนำเสนอ",
    desc: "การขายไอเดียหรือบรีฟงานให้ลูกค้าเข้าใจ", type: "rate" as QuestionType, scoreKey: "presentation",
  },
  decision_making: {
    id: "q_decision_making", labelTh: "การตัดสินใจ",
    desc: "การตัดสินใจด้านกลยุทธ์และการดำเนินงานรายวัน", type: "rate" as QuestionType, scoreKey: "decision_making",
  },
  management: {
    id: "q_management", labelTh: "การจัดการ",
    desc: "การจัดตารางงานและการคุมงบประมาณ", type: "rate" as QuestionType, scoreKey: "management",
  },
  strategic: {
    id: "q_strategic", labelTh: "ทิศทางธุรกิจ",
    desc: "การสร้างความสัมพันธ์กับพาร์ทเนอร์ภายนอก", type: "rate" as QuestionType, scoreKey: "strategic",
  },
};

// creativity as bonus section
const creativityQuestions = {
  ideation: {
    id: "q_ideation", labelTh: "การสร้างไอเดีย",
    desc: "การคิดคอนเซปต์และแนวทางคอนเทนต์ใหม่ๆ", type: "rate" as QuestionType, scoreKey: "creativity",
  },
  execution: {
    id: "q_creative_execution", labelTh: "การลงมือทำ",
    desc: "การนำไอเดียไปสู่ผลงานจริงได้อย่างมีคุณภาพ", type: "rate" as QuestionType, scoreKey: "learning",
  },
};

// Shared script on-time auto question for sumayna
const autoScriptOnTime: KPIQuestion = {
  id: "auto_script_on_time", labelTh: "ส่งสคริปต์ตรงเวลา (ระบบ)",
  desc: "งาน strategy / script ที่ส่งก่อน deadline", type: "auto",
};

// ─── Section builders ─────────────────────────────────────────────────────────

function jpSection(
  roleKey: RoleKey,
  reviewer: ReviewerType,
): KPISection {
  const w = ROLE_SECTION_WEIGHTS[roleKey].job_performance;
  const autoVisible = reviewer === "self" || reviewer === "supervisor";
  return {
    key: "job_performance",
    labelTh: "ผลการปฏิบัติงาน",
    labelEn: "Job Performance",
    weight: w,
    color: "hsl(191 91% 37%)",
    questions: [
      autoVisible ? jpQuestions.autoOnTime : { ...jpQuestions.autoOnTime, type: "hidden" },
      autoVisible ? jpQuestions.autoQuality : { ...jpQuestions.autoQuality, type: "hidden" },
      autoVisible ? jpQuestions.autoTaskCount : { ...jpQuestions.autoTaskCount, type: "hidden" },
      jpQuestions.quality,
      jpQuestions.quantity,
      jpQuestions.punctuality,
      jpQuestions.accountability,
    ],
  };
}

function compSection(roleKey: RoleKey): KPISection {
  const w = ROLE_SECTION_WEIGHTS[roleKey].competency;
  return {
    key: "competency",
    labelTh: "ความสามารถ / ทักษะ",
    labelEn: "Competency",
    weight: w,
    color: "hsl(262 83% 58%)",
    questions: [
      compQuestions.technical,
      compQuestions.problem_solving,
      compQuestions.creativity,
      compQuestions.learning,
    ],
  };
}

function twSection(roleKey: RoleKey): KPISection {
  const w = ROLE_SECTION_WEIGHTS[roleKey].teamwork;
  return {
    key: "teamwork",
    labelTh: "การทำงานเป็นทีม",
    labelEn: "Teamwork",
    weight: w,
    color: "hsl(142 71% 45%)",
    questions: [
      twQuestions.communication,
      twQuestions.support,
      twQuestions.openness,
      twQuestions.collaboration,
    ],
  };
}

function ldSection(roleKey: RoleKey): KPISection {
  const w = ROLE_SECTION_WEIGHTS[roleKey].leadership;
  return {
    key: "leadership",
    labelTh: "ภาวะผู้นำ / ธุรกิจ",
    labelEn: "Leadership",
    weight: w,
    color: "hsl(38 92% 50%)",
    questions: [
      ldQuestions.presentation,
      ldQuestions.decision_making,
      ldQuestions.management,
      ldQuestions.strategic,
    ],
  };
}

function creativitySection(roleKey: RoleKey, reviewer: ReviewerType): KPISection {
  const w = ROLE_SECTION_WEIGHTS[roleKey].creativity;
  const autoVisible = reviewer === "self" || reviewer === "supervisor";
  return {
    key: "creativity_bonus",
    labelTh: "ความคิดสร้างสรรค์ (Bonus)",
    labelEn: "Creativity",
    weight: w,
    color: "hsl(316 73% 52%)",
    questions: [
      autoVisible ? autoScriptOnTime : { ...autoScriptOnTime, type: "hidden" },
      creativityQuestions.ideation,
      creativityQuestions.execution,
    ],
  };
}

// ─── KPI_QUESTIONS: 9 form configs ────────────────────────────────────────────

export const KPI_QUESTIONS: Record<RoleKey, Record<ReviewerType, KPIFormConfig>> = {
  // ── TA ──────────────────────────────────────────────────────────────────────
  ta: {
    self: {
      sections: [
        jpSection("ta", "self"),
        compSection("ta"),
        twSection("ta"),
        ldSection("ta"),
      ],
    },
    peer: {
      sections: [
        jpSection("ta", "peer"),
        compSection("ta"),
        twSection("ta"),
        // Leadership hidden for peers evaluating ta — only self/supervisor assess
        {
          ...ldSection("ta"),
          questions: ldSection("ta").questions.map(q => ({ ...q, type: "hidden" as QuestionType })),
        },
      ],
    },
    supervisor: {
      sections: [
        jpSection("ta", "supervisor"),
        compSection("ta"),
        twSection("ta"),
        ldSection("ta"),
      ],
    },
  },

  // ── HAFEEZ ──────────────────────────────────────────────────────────────────
  hafeez: {
    self: {
      sections: [
        jpSection("hafeez", "self"),
        compSection("hafeez"),
        twSection("hafeez"),
        ldSection("hafeez"),
        creativitySection("hafeez", "self"),
      ],
    },
    peer: {
      sections: [
        jpSection("hafeez", "peer"),
        compSection("hafeez"),
        twSection("hafeez"),
        // Leadership weight is low for hafeez, peers can rate it
        ldSection("hafeez"),
        creativitySection("hafeez", "peer"),
      ],
    },
    supervisor: {
      sections: [
        jpSection("hafeez", "supervisor"),
        compSection("hafeez"),
        twSection("hafeez"),
        ldSection("hafeez"),
        creativitySection("hafeez", "supervisor"),
      ],
    },
  },

  // ── SUMAYNA ─────────────────────────────────────────────────────────────────
  sumayna: {
    self: {
      sections: [
        jpSection("sumayna", "self"),
        compSection("sumayna"),
        twSection("sumayna"),
        // Leadership weight = 0 for sumayna, so hide it
        creativitySection("sumayna", "self"),
      ],
    },
    peer: {
      sections: [
        jpSection("sumayna", "peer"),
        compSection("sumayna"),
        twSection("sumayna"),
        creativitySection("sumayna", "peer"),
      ],
    },
    supervisor: {
      sections: [
        jpSection("sumayna", "supervisor"),
        compSection("sumayna"),
        twSection("sumayna"),
        creativitySection("sumayna", "supervisor"),
      ],
    },
  },
};

// ─── Fallback config (when role is unknown) ───────────────────────────────────
export function getFallbackConfig(reviewer: ReviewerType): KPIFormConfig {
  const roleKey: RoleKey = "ta"; // sensible default
  return KPI_QUESTIONS[roleKey][reviewer];
}

/** Select the correct form config based on evaluatee role + reviewer type */
export function getFormConfig(
  evaluateeRoleKey: RoleKey | null,
  reviewer: ReviewerType,
): KPIFormConfig {
  if (!evaluateeRoleKey) return getFallbackConfig(reviewer);
  return KPI_QUESTIONS[evaluateeRoleKey][reviewer];
}
