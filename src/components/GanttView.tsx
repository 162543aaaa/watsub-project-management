import { useMemo } from "react";
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import type { Project, Task } from "@/hooks/useProjects";

interface GanttViewProps {
  projects: Project[];
}

function taskToGantt(task: Task, projectName: string): GanttTask | null {
  let start: Date;
  let end: Date;

  if (task.start_date && task.due_date) {
    start = new Date(task.start_date);
    end = new Date(task.due_date);
  } else if (task.due_date) {
    end = new Date(task.due_date);
    start = new Date(end);
    start.setDate(start.getDate() - 1);
  } else if (task.start_date) {
    start = new Date(task.start_date);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  } else {
    return null; // skip tasks with no dates
  }

  // Ensure end > start
  if (end <= start) {
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  }

  const progress = task.status === "Done" ? 100 : task.status === "In Progress" ? 50 : 0;

  const deps: string[] = [];
  if (task.depends_on) {
    deps.push(task.depends_on);
  }

  return {
    id: task.id,
    name: task.name,
    start,
    end,
    progress,
    type: "task",
    project: task.project_id || undefined,
    dependencies: deps,
    styles: {
      progressColor: task.status === "Done" ? "#22c55e" : task.status === "In Progress" ? "#06b6d4" : "#9ca3af",
      progressSelectedColor: task.status === "Done" ? "#16a34a" : task.status === "In Progress" ? "#0891b2" : "#6b7280",
      backgroundColor: task.status === "Done" ? "#bbf7d0" : task.status === "In Progress" ? "#cffafe" : "#e5e7eb",
      backgroundSelectedColor: task.status === "Done" ? "#86efac" : task.status === "In Progress" ? "#a5f3fc" : "#d1d5db",
    },
  };
}

export default function GanttView({ projects }: GanttViewProps) {
  const ganttTasks = useMemo(() => {
    const tasks: GanttTask[] = [];

    for (const project of projects) {
      if (project.tasks.length === 0) continue;

      // Collect task items first to determine project date range
      const taskItems: GanttTask[] = [];
      for (const task of project.tasks) {
        const g = taskToGantt(task, project.name);
        if (g) taskItems.push(g);
      }

      if (taskItems.length === 0) continue;

      // Build project-level bar
      const minStart = new Date(Math.min(...taskItems.map(t => t.start.getTime())));
      const maxEnd = new Date(Math.max(...taskItems.map(t => t.end.getTime())));
      const doneTasks = project.tasks.filter(t => t.status === "Done").length;
      const projProgress = project.tasks.length ? Math.round((doneTasks / project.tasks.length) * 100) : 0;

      tasks.push({
        id: project.id,
        name: project.name,
        start: minStart,
        end: maxEnd,
        progress: projProgress,
        type: "project",
        hideChildren: false,
      });

      tasks.push(...taskItems);
    }

    return tasks;
  }, [projects]);

  if (ganttTasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground font-medium">No tasks with dates to display on the timeline</p>
        <p className="text-xs text-muted-foreground mt-1">Add start_date and due_date to your tasks to see them here</p>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper rounded-2xl border border-border bg-card overflow-x-auto">
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Week}
        listCellWidth=""
        columnWidth={60}
        barCornerRadius={6}
        barFill={70}
        fontSize="12"
        rowHeight={40}
        headerHeight={50}
      />
    </div>
  );
}
