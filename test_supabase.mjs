import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://amtbgmethmeafoiyqxgc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtdGJnbWV0aG1lYWZvaXlxeGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODI2NzEsImV4cCI6MjA4NzM1ODY3MX0.7c8c3q9OdDHVJ3XNIq_CUbuIgqsR4zY77ZRdihUq8cs";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("*")
    .limit(1);
    
  if (empError) {
    console.error("Employee Error:", empError);
    return;
  }
  console.log("Employees data:", employees);
}

test();
