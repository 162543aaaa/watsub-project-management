const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, name, avatar, position")
    .eq("active", true)
    .eq("type", "fulltime")
    .order("name", { ascending: true });
    
  if (empError) {
    console.error("Employee Error:", empError);
    return;
  }
  console.log("Employees success");

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, name, assigned_to, status, due_date, estimated_hours, priority")
    .neq("status", "Done");

  if (tasksError) {
    console.error("Tasks Error:", tasksError);
    return;
  }
  console.log("Tasks success");
}

test();
