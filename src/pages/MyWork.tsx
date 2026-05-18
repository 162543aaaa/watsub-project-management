import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { Task } from "@/hooks/useProjects";
import { HideDoneToggle } from "@/components/HideDoneToggle";
import { filterDoneTasks } from "@/lib/taskFilters";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MyTask extends Task {
  _source: "standalone" | "project" | "customer";
  _sourceName?: string;
  _sourceId?: string;
}

export default function MyWork() {
  const { currentEmployee, loading: loadingEmp } = useEmployees();
  const { tasks: standaloneTasks, loading: loadingTasks, updateTask } = useTasks();
  const { projects, loading: loadingProjects, updateTask: updateProjectTask } = useProjects();
  const { customers, loading: loadingCustomers, updateTask: updateCustomerTask } = useCustomers();

  const [showDone, setShowDone] = useState(() => localStorage.getItem("hideDoneTasks") !== "true");

  const myTasks = useMemo(() => {
    if (!currentEmployee) return [];
    const empName = currentEmployee.name;

    const st: MyTask[] = standaloneTasks
      .filter(t => t.assigned_to?.includes(empName))
      .map(t => ({ ...t, _source: "standalone" }));

    const pt: MyTask[] = projects.flatMap(p => 
      p.tasks.filter(t => t.assigned_to?.includes(empName)).map(t => ({
        ...t, _source: "project", _sourceName: p.name, _sourceId: p.id
      }))
    );

    const ct: MyTask[] = customers.flatMap(c => 
      c.tasks.filter(t => t.assigned_to?.includes(empName)).map(t => ({
        ...t, _source: "customer", _sourceName: c.name, _sourceId: c.id
      }))
    );

    return [...st, ...pt, ...ct];
  }, [currentEmployee, standaloneTasks, projects, customers]);

  const visibleTasks = useMemo(() => filterDoneTasks(myTasks, showDone), [myTasks, showDone]);

  const loading = loadingEmp || loadingTasks || loadingProjects || loadingCustomers;

  const handleStatusToggle = async (task: MyTask) => {
    const nextStatus: Record<string, string> = { "To Do": "In Progress", "In Progress": "Done", "Done": "To Do" };
    const newStatus = nextStatus[task.status] || "To Do";
    if (newStatus === "Done" && !task.link && (!task.comments || task.comments.trim().length < 20)) {
      toast({
        title: "กรุณาเพิ่มรายละเอียดหรือ Link ก่อนปิดงาน",
        description: "Please add a note (≥20 chars) or a link before completing this task.",
        variant: "destructive",
      });
      return;
    }
    
    if (task._source === "project" && task._sourceId) {
      await updateProjectTask(task.id, { status: newStatus as any });
    } else if (task._source === "customer" && task._sourceId) {
      await updateCustomerTask(task.id, { status: newStatus as any });
    } else {
      await updateTask(task.id, { status: newStatus as any });
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tasks assigned to you</p>
        </div>
        <HideDoneToggle hideDone={!showDone} setHideDone={(val) => {
          setShowDone(!val);
          localStorage.setItem("hideDoneTasks", String(val));
        }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No tasks found.
          </div>
        ) : (
          visibleTasks.map(task => (
            <div key={task.id} className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {task._source === "project" ? "🚀 Project" : task._source === "customer" ? "💼 Customer" : "📋 Standalone"}
                  {task._sourceName && ` • ${task._sourceName}`}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${task.status === "Done" ? "bg-green-100 text-green-700" : task.status === "In Progress" ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-700"}`}>
                  {task.status}
                </span>
              </div>
              <h3 className="font-bold text-base mb-2">{task.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{task.comments || "No description"}</p>
              
              <div className="flex justify-between items-center mt-auto border-t border-border pt-3">
                <div className="flex gap-2 text-xs">
                  {task.due_date && <span className="text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                </div>
                <button onClick={() => handleStatusToggle(task)} className="text-xs btn-primary py-1 px-3">
                  Toggle Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
