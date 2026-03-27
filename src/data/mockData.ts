export type TaskStatus = "To Do" | "In Progress" | "Done";
export type TaskPriority = "High" | "Medium" | "Low";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";
export type GoalType = "individual" | "team";
export type NotifType = "success" | "error" | "info";

export interface Employee {
  id: string;
  name: string;
  position: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string[];
  dueDate: string;
  startDate?: string;
  comments?: string;
  createdAt: string;
  link?: string;
}

export interface ProjectTask extends Task {
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  month: number;
  note?: string;
  tasks: ProjectTask[];
  createdAt: string;
}

export interface CustomerTask extends Task {
  customerId: string;
}

export interface Customer {
  id: string;
  name: string;
  detail?: string;
  paymentFee?: string;
  projectTitle?: string;
  note?: string;
  month: number;
  tasks: CustomerTask[];
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  deadline: string;
  assignedTo?: string;
}

export interface LeaveRequest {
  id: string;
  requestedBy: string;
  leaveType: string;
  leaveStart: string;
  leaveEnd: string;
  leaveReason: string;
  status: LeaveStatus;
  requestedDate: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  isRead: boolean;
  createdAt: string;
}

// ========= MOCK DATA =========

export const employees: Employee[] = [
  { id: "emp1", name: "TARMISI WANI", position: "Community Lead", email: "tamisiwani@gmail.com", role: "employee" },
  { id: "emp2", name: "สุไมยนา หวังเบ็ญหมัด", position: "Community Support", email: "dudhjjui@gmail.com", role: "employee" },
  { id: "emp3", name: "ฮาฟีซ ดอเลาะ", position: "Community Support", email: "fisdoloh00@gmail.com", role: "employee" },
  { id: "emp4", name: "Faheem Yusoh", position: "Production Assistant", email: "faheem.yusoh@watsub.local", role: "employee" },
  { id: "emp5", name: "zuhariya yato", position: "Content Assistant", email: "zuhariya.yato@watsub.local", role: "employee" },
  { id: "emp6", name: "Natdia Benyakat", position: "Content Coordinator", email: "natdia.benyakat@watsub.local", role: "employee" },
];

export const projects: Project[] = [
  {
    id: "1767602972726",
    name: "Whatlife",
    month: 1,
    createdAt: "2026-01-05T06:54:33.083Z",
    tasks: [
      { id: "t1", projectId: "1767602972726", name: "Teaser TTB", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-08", startDate: "2026-01-05", createdAt: "2026-01-05T08:51:39.717Z" },
      { id: "t2", projectId: "1767602972726", name: "คัดชน TTB", status: "In Progress", priority: "Medium", assignedTo: ["ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-07", startDate: "2026-01-05", createdAt: "2026-01-05T08:52:37.934Z" },
      { id: "t3", projectId: "1767602972726", name: "TTB ทำต่อจากฟิ", status: "To Do", priority: "Medium", assignedTo: ["TARMISI WANI"], dueDate: "2026-01-10", startDate: "2026-01-07", createdAt: "2026-01-05T08:53:38.750Z" },
      { id: "t4", projectId: "1767602972726", name: "ถ่ายทำ TTB - WATSUB", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-09", startDate: "2026-01-06", createdAt: "2026-01-05T10:09:35.967Z" },
      { id: "t5", projectId: "1767602972726", name: "Intro-Motion", status: "In Progress", priority: "High", assignedTo: ["TARMISI WANI"], dueDate: "2026-01-14", startDate: "2025-12-01", comments: "ซาร่าส่ง Motion ส่วนแรก", createdAt: "2026-01-08T07:30:00.081Z" },
      { id: "t6", projectId: "1767602972726", name: "ตัดต่อ SGNC EP1", status: "In Progress", priority: "Medium", assignedTo: ["TARMISI WANI"], dueDate: "2026-01-16", startDate: "2026-01-12", createdAt: "2026-01-09T03:36:15.190Z" },
      { id: "t7", projectId: "1767602972726", name: "ตัดต่อ SGNC EP2", status: "To Do", priority: "Medium", assignedTo: ["TARMISI WANI"], dueDate: "2026-01-22", startDate: "2026-01-19", createdAt: "2026-01-09T03:36:49.044Z" },
    ]
  },
  {
    id: "1767602537873",
    name: "WORK WOK",
    month: 1,
    createdAt: "2026-01-05T08:42:17.873Z",
    tasks: [
      { id: "t8", projectId: "1767602537873", name: "ระบบรายรับ รายจ่าย", status: "In Progress", priority: "High", assignedTo: ["TARMISI WANI"], dueDate: "2026-01-07", startDate: "2026-01-05", createdAt: "2026-01-05T15:02:18.987Z" },
    ]
  },
  {
    id: "1767602570654",
    name: "MOOD",
    month: 1,
    createdAt: "2026-01-05T08:42:50.654Z",
    tasks: [
      { id: "t9", projectId: "1767602570654", name: "20260130_MOOD_มุมบน", status: "Done", priority: "Medium", assignedTo: ["ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-30", startDate: "2026-01-01", link: "https://drive.google.com/drive/folders/10zH-fMCuQUA8YEsg0UQ_wOU5wyysAiUu", createdAt: "2026-01-30T10:11:27.429Z" },
    ]
  },
  {
    id: "1767602600001",
    name: "COOLSUB",
    month: 1,
    createdAt: "2026-01-05T08:48:58.441Z",
    tasks: []
  },
  {
    id: "1767602600002",
    name: "LiVE",
    month: 1,
    createdAt: "2026-01-05T08:49:12.023Z",
    tasks: []
  },
  {
    id: "1767602600003",
    name: "SGNC",
    month: 1,
    createdAt: "2026-01-05T08:49:32.726Z",
    tasks: []
  },
  {
    id: "1767854301264",
    name: "What's write",
    month: 1,
    createdAt: "2026-01-08T06:38:21.264Z",
    tasks: [
      { id: "t10", projectId: "1767854301264", name: "คุไสฟ๊ะ (แค่กล้าครั้งหนึ่ง ชีวิตก็ไม่เหมือนเดิม)", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-12", startDate: "2026-01-09", comments: "แค่กล้าครั้งหนึ่ง ชีวิตก็ไม่เหมือนเดิม", createdAt: "2026-01-12T08:03:36.353Z" },
    ]
  },
  {
    id: "1768205070543",
    name: "Row Gen",
    month: 1,
    createdAt: "2026-01-12T08:04:30.543Z",
    tasks: [
      { id: "t11", projectId: "1768205070543", name: "วัยรุ่นเดินเมือง น้องมุสๆ", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-20", startDate: "2026-01-16", comments: "นัดแล้วที่เบคบอยวันศุกร์ เวลา 16.00 น.", createdAt: "2026-01-12T08:07:43.321Z" },
      { id: "t12", projectId: "1768205070543", name: "คลิปเดินเล่นในเมือง วิชน้องมุส", status: "Done", priority: "Medium", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-21", startDate: "2026-01-17", createdAt: "2026-01-19T04:09:33.996Z" },
    ]
  },
  {
    id: "1770262382099",
    name: "COOLSUB",
    month: 2,
    createdAt: "2026-02-05T03:36:22.099Z",
    tasks: []
  },
  {
    id: "1770262607942",
    name: "collor walk",
    month: 2,
    createdAt: "2026-02-05T03:36:47.942Z",
    tasks: [
      { id: "t13", projectId: "1770262607942", name: "exhibition", status: "To Do", priority: "High", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-02-17", startDate: "2026-02-15", createdAt: "2026-02-05T03:38:14.158Z" },
      { id: "t14", projectId: "1770262607942", name: "โปสเตอร์งาน", status: "To Do", priority: "Medium", assignedTo: ["TARMISI WANI"], dueDate: "2026-02-06", startDate: "2026-02-05", createdAt: "2026-02-05T03:39:22.182Z" },
      { id: "t15", projectId: "1770262607942", name: "โปสเตอร์ส่งภาพเข้ามามีส่วนร่วม", status: "In Progress", priority: "High", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-02-06", startDate: "2026-02-05", createdAt: "2026-02-05T03:40:11.982Z" },
    ]
  },
];

export const customers: Customer[] = [
  {
    id: "1767603788555",
    name: "กะยัสมิน",
    projectTitle: "หมอเพชรดาว หาเสียง",
    paymentFee: "5000",
    month: 1,
    tasks: [
      { id: "ct1", customerId: "1767603788555", name: "บริการบันทึกภาพและผลิตคลิป Reels/Short VDO สำหรับงานหาเสียง", status: "Done", priority: "High", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2025-12-25", startDate: "2025-12-23", comments: "ยังไม่ได้จ่าย", link: "https://drive.google.com/drive/folders/1oKoYHtyfzsbVE6HPktVSUjSSCTl2HE5s", createdAt: "2026-01-05T09:06:14.070Z" }
    ]
  },
  {
    id: "1767676330672",
    name: "นครเครื่องเงิน",
    detail: "แคมเปญช่วง รอมฎอน-ฮารีรายอ 2026",
    projectTitle: "โฆษณาแบรนด์ นครเครื่องเงิน",
    month: 1,
    tasks: [
      { id: "ct2", customerId: "1767676330672", name: "รายละเอียด influ ของนครเครื่องเงิน", status: "Done", priority: "High", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-06", startDate: "2026-01-05", createdAt: "2026-01-06T05:19:01.598Z" },
      { id: "ct3", customerId: "1767676330672", name: "สคริปต์ Swarovski", status: "Done", priority: "High", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-16", startDate: "2026-01-14", comments: "แนะนำ (Hard sell) ขายคริสตัล เล่าจุดเด่น", link: "https://www.canva.com/design/DAG-XbiskNs", createdAt: "2026-01-14T03:21:26.147Z" },
      { id: "ct4", customerId: "1767676330672", name: "ลงพื้นที่ นครเครื่องเงิน", status: "Done", priority: "High", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-20", startDate: "2026-01-20", createdAt: "2026-01-19T04:11:24.197Z" },
      { id: "ct5", customerId: "1767676330672", name: "ตัดคลิป Cont.1 Swarovski", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-29", startDate: "2026-01-25", comments: "ส่งให้ลูกค้าแล้วเรียบร้อย", createdAt: "2026-01-30T03:57:40.455Z" },
    ]
  },
  {
    id: "1767677302932",
    name: "YRU",
    projectTitle: "คลิปประชาสัมพันธ์และหลักสูตรนำร่อง",
    note: "ได้ข้อมูลมา 3 เหลืออีก 3!!!",
    month: 2,
    tasks: [
      { id: "ct6", customerId: "1767677302932", name: "YRU BiZ", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "", createdAt: "2026-01-06T05:28:47.925Z" },
      { id: "ct7", customerId: "1767677302932", name: "สคริปต์หลักสูตรนำร่อง โลจิสติก", status: "Done", priority: "Medium", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-23", startDate: "2026-01-23", comments: "ส่งไปให้บรูฟแล้ว", createdAt: "2026-01-06T05:30:45.495Z" },
      { id: "ct8", customerId: "1767677302932", name: "สคริปต์หลักสูตรนำร่อง ดิจิทัล", status: "To Do", priority: "Medium", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-16", createdAt: "2026-01-06T05:31:24.360Z" },
      { id: "ct9", customerId: "1767677302932", name: "ลงพื้นที่ถ่าย 2 นิเทศ โลจิสติกส์", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-30", startDate: "2026-01-26", link: "https://drive.google.com/file/d/1gohmYrKhPsevwpCQUOzCrTMrCgutrw09", createdAt: "2026-01-26T03:49:47.934Z" },
    ]
  },
  {
    id: "1767606143958",
    name: "Proud Coffee",
    detail: "ประสบการณ์ภายในร้าน",
    projectTitle: "คอนเทนท์สร้างการรับรู้",
    month: 2,
    tasks: [
      { id: "ct10", customerId: "1767606143958", name: "ลงพื้นที่ไปคุย แนวทาง Cont.", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-13", startDate: "2026-01-13", createdAt: "2026-01-08T06:37:46.810Z" },
      { id: "ct11", customerId: "1767606143958", name: "Cont. 1 ประสบการณ์ของลูกค้า", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-02-07", startDate: "2026-01-30", createdAt: "2026-01-14T04:46:28.971Z" },
      { id: "ct12", customerId: "1767606143958", name: "Cont. 2 ประสบการณ์ในห้องคั่ว", status: "Done", priority: "High", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-02-07", startDate: "2026-01-30", comments: "ลงพื้นที่เสร็จแล้ว แต่!! มีเก็บฟุตเพิ่มเติม", createdAt: "2026-01-14T04:51:42.195Z" },
      { id: "ct13", customerId: "1767606143958", name: "Cont.3 ประสบการณ์ในมุมของผู้ให้บริการ", status: "Done", priority: "High", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-02-07", startDate: "2026-01-30", comments: "ลงพื้นที่เก็บพี่บาริต้ามาแล้ว 3 คน", createdAt: "2026-01-26T03:43:41.381Z" },
    ]
  },
  {
    id: "1768536092611",
    name: "WAdDee",
    detail: "สร้างคอนเทน tiktok",
    projectTitle: "โครงการพัฒนาศักยภาพสุดยอดชุมชนต้นแบบ",
    paymentFee: "25,000",
    month: 2,
    tasks: [
      { id: "ct14", customerId: "1768536092611", name: "เตรียมข้อมูล Workshop", status: "To Do", priority: "High", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-30", startDate: "2026-01-30", createdAt: "2026-01-26T03:44:43.545Z" },
    ]
  },
  {
    id: "1769835409275",
    name: "อบอุ่น",
    projectTitle: "อบอุ่น - 6 content",
    month: 2,
    tasks: [
      { id: "ct15", customerId: "1769835409275", name: "ปรับแก้สคริป ต่อจากมัง", status: "To Do", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-02-03", startDate: "2026-02-01", createdAt: "2026-01-31T05:00:59.586Z" },
      { id: "ct16", customerId: "1769835409275", name: "นัดประชุม กับ พี่จ้า พี่โย", status: "To Do", priority: "Medium", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-02-04", startDate: "2026-02-04", createdAt: "2026-01-31T05:01:30.382Z" },
    ]
  },
  {
    id: "1770006601302",
    name: "SG",
    projectTitle: "Case study",
    month: 2,
    tasks: [
      { id: "ct17", customerId: "1770006601302", name: "สคริป Kedaraya", status: "To Do", priority: "Medium", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-02-05", startDate: "2026-02-02", createdAt: "2026-02-02T04:31:23.034Z" },
      { id: "ct18", customerId: "1770006601302", name: "ตัดต่อ Kedaraya", status: "To Do", priority: "Medium", assignedTo: ["ฮาฟีซ ดอเลาะ"], dueDate: "2026-02-11", startDate: "2026-02-02", createdAt: "2026-02-02T04:33:08.517Z" },
    ]
  },
];

export const standaloneTasksList: Task[] = [
  { id: "st1", name: "Teaser TTB", status: "Done", priority: "Medium", assignedTo: ["TARMISI WANI", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-08", startDate: "2026-01-05", createdAt: "2026-01-05T08:51:39.717Z" },
  { id: "st2", name: "คัดชน TTB", status: "In Progress", priority: "Medium", assignedTo: ["ฮาฟีซ ดอเลาะ"], dueDate: "2026-01-07", startDate: "2026-01-05", createdAt: "2026-01-05T08:52:37.934Z" },
  { id: "st3", name: "TTB ทำต่อจากฟิ", status: "To Do", priority: "Medium", assignedTo: ["TARMISI WANI"], dueDate: "2026-02-28", startDate: "2026-02-15", createdAt: "2026-01-05T08:53:38.750Z" },
  { id: "st4", name: "ระบบรายรับ รายจ่าย", status: "In Progress", priority: "High", assignedTo: ["TARMISI WANI"], dueDate: "2026-02-20", startDate: "2026-02-01", createdAt: "2026-01-05T15:02:18.987Z" },
  { id: "st5", name: "Exhibition collor walk", status: "To Do", priority: "High", assignedTo: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], dueDate: "2026-02-17", startDate: "2026-02-15", createdAt: "2026-02-05T03:38:14.158Z" },
  { id: "st6", name: "สคริป Kedaraya", status: "To Do", priority: "Medium", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-02-25", startDate: "2026-02-10", createdAt: "2026-02-02T04:31:23.034Z" },
  { id: "st7", name: "Intro-Motion", status: "In Progress", priority: "High", assignedTo: ["TARMISI WANI"], dueDate: "2026-02-18", startDate: "2025-12-01", comments: "ซาร่าส่ง Motion ส่วนแรก", createdAt: "2026-01-08T07:30:00.081Z" },
  { id: "st8", name: "เตรียมสไลด์แนวทาง Content", status: "Done", priority: "High", assignedTo: ["สุไมยนา หวังเบ็ญหมัด"], dueDate: "2026-01-12", startDate: "2026-01-09", createdAt: "2026-01-09T03:32:52.422Z" },
];

export const goals: Goal[] = [
  {
    id: "g1",
    title: "เขียนบทความสัมภาษณ์ หรืออื่น ๆ รวมกันได้ 10 บทความ (ใน 1 ไตรมาส)",
    type: "individual",
    targetValue: 100,
    currentValue: 0,
    deadline: "2026-03-31",
    assignedTo: "สุไมยนา หวังเบ็ญหมัด",
  },
  {
    id: "g2",
    title: "เพิ่มลูกค้าใหม่ให้ได้ 10 รายในไตรมาสแรก",
    type: "team",
    targetValue: 10,
    currentValue: 7,
    deadline: "2026-03-31",
  },
  {
    id: "g3",
    title: "ผลิต Short Video ให้ครบ 50 ชิ้น",
    type: "team",
    targetValue: 50,
    currentValue: 32,
    deadline: "2026-06-30",
  },
  {
    id: "g4",
    title: "เรียนคอร์สตัดต่อขั้นสูง",
    type: "individual",
    targetValue: 100,
    currentValue: 60,
    deadline: "2026-04-30",
    assignedTo: "ฮาฟีซ ดอเลาะ",
  },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "l1", requestedBy: "ฮาฟีซ ดอเลาะ", leaveType: "Personal", leaveStart: "2026-01-07", leaveEnd: "2026-01-07", leaveReason: "ไปงานแต่งครับผม", status: "Approved", requestedDate: "2026-01-05T07:10:40.382Z" },
  { id: "l2", requestedBy: "TARMISI WANI", leaveType: "Unpaid", leaveStart: "2026-01-15", leaveEnd: "2026-01-15", leaveReason: "ลากลับบ้าน", status: "Approved", requestedDate: "2026-01-15T05:49:53.711Z" },
  { id: "l3", requestedBy: "สุไมยนา หวังเบ็ญหมัด", leaveType: "Annual", leaveStart: "2026-02-02", leaveEnd: "2026-02-02", leaveReason: "ลากิจ ติดธุระส่วนตัวที่บ้าน", status: "Approved", requestedDate: "2026-02-01T16:31:29.253Z" },
  { id: "l4", requestedBy: "ฮาฟีซ ดอเลาะ", leaveType: "Personal", leaveStart: "2026-02-06", leaveEnd: "2026-02-06", leaveReason: "ไปงานแต่ง", status: "Approved", requestedDate: "2026-02-03T13:43:51.014Z" },
  { id: "l5", requestedBy: "สุไมยนา หวังเบ็ญหมัด", leaveType: "Sick", leaveStart: "2026-02-20", leaveEnd: "2026-02-21", leaveReason: "ไม่สบาย มีไข้", status: "Pending", requestedDate: "2026-02-18T09:00:00.000Z" },
  { id: "l6", requestedBy: "ฮาฟีซ ดอเลาะ", leaveType: "Annual", leaveStart: "2026-03-01", leaveEnd: "2026-03-03", leaveReason: "พักผ่อนช่วงวันหยุด", status: "Pending", requestedDate: "2026-02-19T10:00:00.000Z" },
];

export const notifications: Notification[] = [
  { id: "n1", title: "New Leave Request", message: "ฮาฟีซ ดอเลาะ requested leave", type: "info", isRead: true, createdAt: "2026-01-05T07:10:41.353Z" },
  { id: "n2", title: "Leave Approved", message: "ฮาฟีซ ดอเลาะ's leave approved", type: "success", isRead: true, createdAt: "2026-01-05T07:10:58.235Z" },
  { id: "n3", title: "New Leave Request", message: "TARMISI WANI requested leave", type: "info", isRead: true, createdAt: "2026-01-15T05:49:55.011Z" },
  { id: "n4", title: "Leave Approved", message: "TARMISI WANI's leave approved", type: "success", isRead: true, createdAt: "2026-01-15T05:50:00.151Z" },
  { id: "n5", title: "New Leave Request", message: "สุไมยนา หวังเบ็ญหมัด requested leave", type: "info", isRead: false, createdAt: "2026-02-01T16:31:30.269Z" },
  { id: "n6", title: "Leave Approved", message: "สุไมยนา หวังเบ็ญหมัด's leave approved", type: "success", isRead: false, createdAt: "2026-02-03T13:42:08.738Z" },
  { id: "n7", title: "New Leave Request", message: "ฮาฟีซ ดอเลาะ requested leave", type: "info", isRead: false, createdAt: "2026-02-03T13:43:52.206Z" },
  { id: "n8", title: "Leave Approved", message: "ฮาฟีซ ดอเลาะ's leave approved", type: "success", isRead: false, createdAt: "2026-02-03T13:44:05.419Z" },
  { id: "n9", title: "Task Overdue", message: "คัดชน TTB is past due date", type: "error", isRead: false, createdAt: "2026-02-10T08:00:00.000Z" },
];

export const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthNamesTH = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export const getAvatarColor = (name: string): string => {
  const colors = [
    "from-cyan-400 to-teal-500",
    "from-violet-400 to-purple-500",
    "from-rose-400 to-pink-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-green-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

export const getInitials = (name: string): string => {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};
