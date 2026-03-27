import { supabase } from "@/integrations/supabase/client";
import { TEAM_ROSTER } from "@/config/teamRoster";

// Seed all mock data to Supabase database
export async function seedDatabase() {
  // Check if already seeded
  const { data: existingEmployees } = await supabase.from("employees").select("id").limit(1);
  if (existingEmployees && existingEmployees.length > 0) {
    console.log("Database already seeded");
    return;
  }

  console.log("Seeding database...");

  // Seed employees
  const { data: empData, error: empError } = await supabase
    .from("employees")
    .insert(TEAM_ROSTER)
    .select();
  if (empError) { console.error("Employee seed error:", empError); return; }
  console.log("Employees seeded:", empData?.length);

  // Seed projects
  const { data: projData, error: projError } = await supabase.from("projects").insert([
    { name: "Whatlife", month: 1 },
    { name: "WORK WOK", month: 1 },
    { name: "MOOD", month: 1 },
    { name: "COOLSUB", month: 1 },
    { name: "LiVE", month: 1 },
    { name: "SGNC", month: 1 },
    { name: "What's write", month: 1 },
    { name: "Row Gen", month: 1 },
    { name: "COOLSUB", month: 2 },
    { name: "collor walk", month: 2 },
  ]).select();
  if (projError) { console.error("Project seed error:", projError); return; }
  console.log("Projects seeded:", projData?.length);

  const getProj = (name: string, month: number) => projData?.find(p => p.name === name && p.month === month);

  // Project tasks
  const projectTasks = [];
  const whatlife = getProj("Whatlife", 1);
  if (whatlife) {
    projectTasks.push(
      { name: "Teaser TTB", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-08", start_date: "2026-01-05", task_type: "project", project_id: whatlife.id },
      { name: "คัดชน TTB", status: "In Progress", priority: "Medium", assigned_to: ["ฮาฟีซ ดอเลาะ"], due_date: "2026-01-07", start_date: "2026-01-05", task_type: "project", project_id: whatlife.id },
      { name: "TTB ทำต่อจากฟิ", status: "To Do", priority: "Medium", assigned_to: ["TARMISI WANI"], due_date: "2026-01-10", start_date: "2026-01-07", task_type: "project", project_id: whatlife.id },
      { name: "ถ่ายทำ TTB - WATSUB", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-09", start_date: "2026-01-06", task_type: "project", project_id: whatlife.id },
      { name: "Intro-Motion", status: "In Progress", priority: "High", assigned_to: ["TARMISI WANI"], due_date: "2026-01-14", start_date: "2025-12-01", comments: "ซาร่าส่ง Motion ส่วนแรก", task_type: "project", project_id: whatlife.id },
      { name: "ตัดต่อ SGNC EP1", status: "In Progress", priority: "Medium", assigned_to: ["TARMISI WANI"], due_date: "2026-01-16", start_date: "2026-01-12", task_type: "project", project_id: whatlife.id },
      { name: "ตัดต่อ SGNC EP2", status: "To Do", priority: "Medium", assigned_to: ["TARMISI WANI"], due_date: "2026-01-22", start_date: "2026-01-19", task_type: "project", project_id: whatlife.id },
    );
  }
  const workwok = getProj("WORK WOK", 1);
  if (workwok) {
    projectTasks.push({ name: "ระบบรายรับ รายจ่าย", status: "In Progress", priority: "High", assigned_to: ["TARMISI WANI"], due_date: "2026-01-07", start_date: "2026-01-05", task_type: "project", project_id: workwok.id });
  }
  const mood = getProj("MOOD", 1);
  if (mood) {
    projectTasks.push({ name: "20260130_MOOD_มุมบน", status: "Done", priority: "Medium", assigned_to: ["ฮาฟีซ ดอเลาะ"], due_date: "2026-01-30", start_date: "2026-01-01", link: "https://drive.google.com/drive/folders/10zH-fMCuQUA8YEsg0UQ_wOU5wyysAiUu", task_type: "project", project_id: mood.id });
  }
  const whatswrite = getProj("What's write", 1);
  if (whatswrite) {
    projectTasks.push({ name: "คุไสฟ๊ะ (แค่กล้าครั้งหนึ่ง ชีวิตก็ไม่เหมือนเดิม)", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-01-12", start_date: "2026-01-09", comments: "แค่กล้าครั้งหนึ่ง ชีวิตก็ไม่เหมือนเดิม", task_type: "project", project_id: whatswrite.id });
  }
  const rowgen = getProj("Row Gen", 1);
  if (rowgen) {
    projectTasks.push(
      { name: "วัยรุ่นเดินเมือง น้องมุสๆ", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-20", start_date: "2026-01-16", comments: "นัดแล้วที่เบคบอยวันศุกร์ เวลา 16.00 น.", task_type: "project", project_id: rowgen.id },
      { name: "คลิปเดินเล่นในเมือง วิชน้องมุส", status: "Done", priority: "Medium", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-01-21", start_date: "2026-01-17", task_type: "project", project_id: rowgen.id },
    );
  }
  const colorwalk = getProj("collor walk", 2);
  if (colorwalk) {
    projectTasks.push(
      { name: "exhibition", status: "To Do", priority: "High", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-02-17", start_date: "2026-02-15", task_type: "project", project_id: colorwalk.id },
      { name: "โปสเตอร์งาน", status: "To Do", priority: "Medium", assigned_to: ["TARMISI WANI"], due_date: "2026-02-06", start_date: "2026-02-05", task_type: "project", project_id: colorwalk.id },
      { name: "โปสเตอร์ส่งภาพเข้ามามีส่วนร่วม", status: "In Progress", priority: "High", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-02-06", start_date: "2026-02-05", task_type: "project", project_id: colorwalk.id },
    );
  }

  if (projectTasks.length > 0) {
    const { error: ptError } = await supabase.from("tasks").insert(projectTasks);
    if (ptError) console.error("Project tasks seed error:", ptError);
    else console.log("Project tasks seeded:", projectTasks.length);
  }

  // Seed customers
  const { data: custData, error: custError } = await supabase.from("customers").insert([
    { name: "กะยัสมิน", project_title: "หมอเพชรดาว หาเสียง", payment_fee: "5000", month: 1 },
    { name: "นครเครื่องเงิน", detail: "แคมเปญช่วง รอมฎอน-ฮารีรายอ 2026", project_title: "โฆษณาแบรนด์ นครเครื่องเงิน", month: 1 },
    { name: "YRU", project_title: "คลิปประชาสัมพันธ์และหลักสูตรนำร่อง", note: "ได้ข้อมูลมา 3 เหลืออีก 3!!!", month: 2 },
    { name: "Proud Coffee", detail: "ประสบการณ์ภายในร้าน", project_title: "คอนเทนท์สร้างการรับรู้", month: 2 },
    { name: "WAdDee", detail: "สร้างคอนเทน tiktok", project_title: "โครงการพัฒนาศักยภาพสุดยอดชุมชนต้นแบบ", payment_fee: "25000", month: 2 },
    { name: "อบอุ่น", project_title: "อบอุ่น - 6 content", month: 2 },
    { name: "SG", project_title: "Case study", month: 2 },
  ]).select();
  if (custError) { console.error("Customer seed error:", custError); return; }
  console.log("Customers seeded:", custData?.length);

  const getCust = (name: string) => custData?.find(c => c.name === name);

  // Customer tasks
  const customerTasks = [];
  const kayasmin = getCust("กะยัสมิน");
  if (kayasmin) {
    customerTasks.push({ name: "บริการบันทึกภาพและผลิตคลิป Reels/Short VDO สำหรับงานหาเสียง", status: "Done", priority: "High", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2025-12-25", start_date: "2025-12-23", comments: "ยังไม่ได้จ่าย", link: "https://drive.google.com/drive/folders/1oKoYHtyfzsbVE6HPktVSUjSSCTl2HE5s", task_type: "customer", customer_id: kayasmin.id });
  }
  const nakhon = getCust("นครเครื่องเงิน");
  if (nakhon) {
    customerTasks.push(
      { name: "รายละเอียด influ ของนครเครื่องเงิน", status: "Done", priority: "High", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-01-06", start_date: "2026-01-05", task_type: "customer", customer_id: nakhon.id },
      { name: "สคริปต์ Swarovski", status: "Done", priority: "High", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-01-16", start_date: "2026-01-14", comments: "แนะนำ (Hard sell) ขายคริสตัล เล่าจุดเด่น", link: "https://www.canva.com/design/DAG-XbiskNs", task_type: "customer", customer_id: nakhon.id },
      { name: "ลงพื้นที่ นครเครื่องเงิน", status: "Done", priority: "High", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-20", start_date: "2026-01-20", task_type: "customer", customer_id: nakhon.id },
      { name: "ตัดคลิป Cont.1 Swarovski", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-29", start_date: "2026-01-25", comments: "ส่งให้ลูกค้าแล้วเรียบร้อย", task_type: "customer", customer_id: nakhon.id },
    );
  }
  const yru = getCust("YRU");
  if (yru) {
    customerTasks.push(
      { name: "YRU BiZ", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "", task_type: "customer", customer_id: yru.id },
      { name: "สคริปต์หลักสูตรนำร่อง โลจิสติก", status: "Done", priority: "Medium", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-01-23", start_date: "2026-01-23", comments: "ส่งไปให้บรูฟแล้ว", task_type: "customer", customer_id: yru.id },
      { name: "สคริปต์หลักสูตรนำร่อง ดิจิทัล", status: "To Do", priority: "Medium", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-01-16", task_type: "customer", customer_id: yru.id },
      { name: "ลงพื้นที่ถ่าย 2 นิเทศ โลจิสติกส์", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-30", start_date: "2026-01-26", link: "https://drive.google.com/file/d/1gohmYrKhPsevwpCQUOzCrTMrCgutrw09", task_type: "customer", customer_id: yru.id },
    );
  }
  const proudcoffee = getCust("Proud Coffee");
  if (proudcoffee) {
    customerTasks.push(
      { name: "ลงพื้นที่ไปคุย แนวทาง Cont.", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-13", start_date: "2026-01-13", task_type: "customer", customer_id: proudcoffee.id },
      { name: "Cont. 1 ประสบการณ์ของลูกค้า", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-02-07", start_date: "2026-01-30", task_type: "customer", customer_id: proudcoffee.id },
      { name: "Cont. 2 ประสบการณ์ในห้องคั่ว", status: "Done", priority: "High", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-02-07", start_date: "2026-01-30", comments: "ลงพื้นที่เสร็จแล้ว แต่!! มีเก็บฟุตเพิ่มเติม", task_type: "customer", customer_id: proudcoffee.id },
      { name: "Cont.3 ประสบการณ์ในมุมของผู้ให้บริการ", status: "Done", priority: "High", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-02-07", start_date: "2026-01-30", comments: "ลงพื้นที่เก็บพี่บาริต้ามาแล้ว 3 คน", task_type: "customer", customer_id: proudcoffee.id },
    );
  }
  const waddee = getCust("WAdDee");
  if (waddee) {
    customerTasks.push({ name: "เตรียมข้อมูล Workshop", status: "To Do", priority: "High", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-01-30", start_date: "2026-01-30", task_type: "customer", customer_id: waddee.id });
  }
  const abouan = getCust("อบอุ่น");
  if (abouan) {
    customerTasks.push(
      { name: "ปรับแก้สคริป ต่อจากมัง", status: "To Do", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-02-03", start_date: "2026-02-01", task_type: "customer", customer_id: abouan.id },
      { name: "นัดประชุม กับ พี่จ้า พี่โย", status: "To Do", priority: "Medium", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-02-04", start_date: "2026-02-04", task_type: "customer", customer_id: abouan.id },
    );
  }
  const sg = getCust("SG");
  if (sg) {
    customerTasks.push(
      { name: "สคริป Kedaraya", status: "To Do", priority: "Medium", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-02-05", start_date: "2026-02-02", task_type: "customer", customer_id: sg.id },
      { name: "ตัดต่อ Kedaraya", status: "To Do", priority: "Medium", assigned_to: ["ฮาฟีซ ดอเลาะ"], due_date: "2026-02-11", start_date: "2026-02-02", task_type: "customer", customer_id: sg.id },
    );
  }

  if (customerTasks.length > 0) {
    const { error: ctError } = await supabase.from("tasks").insert(customerTasks);
    if (ctError) console.error("Customer tasks seed error:", ctError);
    else console.log("Customer tasks seeded:", customerTasks.length);
  }

  // Seed standalone tasks
  const standaloneTasks = [
    { name: "Teaser TTB", status: "Done", priority: "Medium", assigned_to: ["TARMISI WANI", "ฮาฟีซ ดอเลาะ"], due_date: "2026-01-08", start_date: "2026-01-05", task_type: "standalone" },
    { name: "คัดชน TTB", status: "In Progress", priority: "Medium", assigned_to: ["ฮาฟีซ ดอเลาะ"], due_date: "2026-01-07", start_date: "2026-01-05", task_type: "standalone" },
    { name: "TTB ทำต่อจากฟิ", status: "To Do", priority: "Medium", assigned_to: ["TARMISI WANI"], due_date: "2026-02-28", start_date: "2026-02-15", task_type: "standalone" },
    { name: "ระบบรายรับ รายจ่าย", status: "In Progress", priority: "High", assigned_to: ["TARMISI WANI"], due_date: "2026-02-20", start_date: "2026-02-01", task_type: "standalone" },
    { name: "Exhibition collor walk", status: "To Do", priority: "High", assigned_to: ["TARMISI WANI", "สุไมยนา หวังเบ็ญหมัด", "ฮาฟีซ ดอเลาะ"], due_date: "2026-02-17", start_date: "2026-02-15", task_type: "standalone" },
    { name: "สคริป Kedaraya", status: "To Do", priority: "Medium", assigned_to: ["สุไมยนา หวังเบ็ญหมัด"], due_date: "2026-02-25", start_date: "2026-02-10", task_type: "standalone" },
  ];
  const { error: stError } = await supabase.from("tasks").insert(standaloneTasks);
  if (stError) console.error("Standalone tasks seed error:", stError);
  else console.log("Standalone tasks seeded:", standaloneTasks.length);

  // Seed goals
  const { error: goalError } = await supabase.from("goals").insert([
    { title: "ส่งมอบโปรเจกต์ Q1 ให้ครบ", type: "team", target_value: 10, current_value: 6, deadline: "2026-03-31" },
    { title: "เพิ่มลูกค้าใหม่ 5 ราย", type: "team", target_value: 5, current_value: 2, deadline: "2026-06-30" },
    { title: "ยอดขาย 100,000 บาท", type: "team", target_value: 100000, current_value: 55000, deadline: "2026-12-31" },
    { title: "ตัดต่อวิดีโอ 20 คลิป", type: "individual", target_value: 20, current_value: 12, deadline: "2026-03-31", assigned_to: "TARMISI WANI" },
    { title: "เขียนสคริปต์ 15 ชิ้น", type: "individual", target_value: 15, current_value: 8, deadline: "2026-03-31", assigned_to: "สุไมยนา หวังเบ็ญหมัด" },
  ]);
  if (goalError) console.error("Goals seed error:", goalError);
  else console.log("Goals seeded");

  // Seed notifications
  const { error: notifError } = await supabase.from("notifications").insert([
    { title: "ระบบเริ่มต้นทำงาน", message: "Project Hub พร้อมใช้งานแล้ว!", type: "success", is_read: false },
    { title: "งานใกล้ครบกำหนด", message: "Exhibition collor walk ครบกำหนดวันที่ 17 ก.พ.", type: "info", is_read: false },
    { title: "โปรเจกต์ใหม่", message: "collor walk ถูกสร้างขึ้นแล้ว", type: "info", is_read: true },
  ]);
  if (notifError) console.error("Notifications seed error:", notifError);
  else console.log("Notifications seeded");

  console.log("Database seeding complete!");
}
