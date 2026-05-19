import React, { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import EditTaskModal from "@/components/EditTaskModal";
import TaskDetailModal from "@/components/TaskDetailModal";
import GanttView from "@/components/GanttView";
import { HideDoneToggle } from "@/components/HideDoneToggle";
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  LayoutList, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

export default function Tasks() {
  // --- Core State & Hooks (รักษา Logic เดิมไว้ทั้งหมด) ---
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const { employees } = useEmployees();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [hideDone, setHideDone] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "gantt">("list");

  // State สำหรับควบคุม Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // --- Filter Logic ---
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesProject = projectFilter === "all" || task.project_id === projectFilter;
    const matchesHideDone = !hideDone || task.status !== "Done";

    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesHideDone;
  });

  // ฟังก์ชันช่วยเลือกสีให้ Badge ดูสวยงามและเข้าธีม
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "Medium": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "In Progress": return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "Review": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto animate-fade-in">
      
      {/* 1. Header Section - ดีไซน์เรียบหรูสไตล์เดียวกับหน้า Projects */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r flow-root from-white to-white/60 bg-clip-text text-transparent">
            Tasks Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ติดตาม ตรวจสอบ และจัดการงานทั้งหมดภายในองค์กรของคุณ
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* View Switcher Toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2 h-8"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
              <span>List</span>
            </Button>
            <Button
              variant={viewMode === "gantt" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2 h-8"
              onClick={() => setViewMode("gantt")}
            >
              <Calendar className="h-4 w-4" />
              <span>Gantt</span>
            </Button>
          </div>

          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-9"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </Button>
        </div>
      </div>

      {/* 2. Controls & Filters Section - ยุบรวมเข้า GlassCard ให้ดูเป็นสัดส่วน */}
      <GlassCard className="p-4 bg-black/20 backdrop-blur-md border-white/10">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 focus-visible:ring-white/20 text-sm h-9"
              />
            </div>

            {/* Project Filter */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-sm h-9">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-md border-white/10">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-sm h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-md border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Todo">Todo</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-sm h-9">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-md border-white/10">
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggle เสริมเพื่อความสะอาดของข้อมูล */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3 w-3" />
              <span>แสดงผลลัพธ์ทั้งหมด {filteredTasks.length} รายการ</span>
            </div>
            <HideDoneToggle checked={hideDone} onCheckedChange={setHideDone} />
          </div>
        </div>
      </GlassCard>

      {/* 3. Main Content Display Panel */}
      {viewMode === "gantt" ? (
        <GlassCard className="p-6 bg-black/10 backdrop-blur-md border-white/10">
          <GanttView tasks={filteredTasks} projects={projects} employees={employees} />
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden bg-black/10 backdrop-blur-md border-white/5 shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Clock className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
              กำลังโหลดข้อมูลงาน...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-40" />
              ไม่พบข้อมูลงานที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5 border-b border-white/10">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="w-[40%] text-white font-medium">Task Name</TableHead>
                    <TableHead className="text-white font-medium">Project</TableHead>
                    <TableHead className="text-white font-medium">Assignee</TableHead>
                    <TableHead className="text-white font-medium">Priority</TableHead>
                    <TableHead className="text-white font-medium">Status</TableHead>
                    <TableHead className="text-white font-medium text-right">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.project_id);
                    return (
                      <TableRow
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsDetailModalOpen(true);
                        }}
                        className="cursor-pointer border-white/5 hover:bg-white/5 transition-colors duration-150 group"
                      >
                        {/* Task Title & Details */}
                        <TableCell className="py-3.5 font-medium text-white max-w-sm truncate">
                          <div className="flex flex-col gap-0.5">
                            <span className="group-hover:text-primary transition-colors">
                              {task.title}
                            </span>
                            {task.description && (
                              <span className="text-xs text-muted-foreground font-normal line-clamp-1">
                                {task.description}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Project Name */}
                        <TableCell className="text-muted-foreground text-sm">
                          {project ? project.name : "Unassigned"}
                        </TableCell>

                        {/* Assignee Avatar */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EmployeeAvatar 
                              employeeId={task.assignee_id} 
                              className="h-6 w-6 border border-white/10 shadow-sm"
                            />
                          </div>
                        </TableCell>

                        {/* Priority Badge */}
                        <TableCell>
                          <Badge variant="outline" className={`font-normal rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell>
                          <Badge variant="outline" className={`font-medium rounded-md ${getStatusColor(task.status)}`}>
                            {task.status}
                          </Badge>
                        </TableCell>

                        {/* Due Date */}
                        <TableCell className="text-right text-muted-foreground text-sm font-mono">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString("th-TH", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit"
                          }) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      )}

      {/* --- 4. Modals Layer (รักษา Component เดิมทั้งหมดไว้เพื่อความเสถียร) --- */}
      {isAddModalOpen && (
        <EditTaskModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={createTask}
          projects={projects}
          employees={employees}
        />
      )}

      {isDetailModalOpen && selectedTask && (
        <TaskDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onUpdate={(updatedData) => updateTask(selectedTask.id, updatedData)}
          onDelete={() => {
            deleteTask(selectedTask.id);
            setIsDetailModalOpen(false);
            setSelectedTask(null);
          }}
          projects={projects}
          employees={employees}
        />
      )}
    </div>
  );
}
