export interface EmployeeWorkload {
  employeeId: string;
  employeeName: string;
  position: string;
  inProgressCount: number;
  todoCount: number;
  totalActive: number;
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    priority: string;
    due_date?: string | null;
  }>;
}

export interface TeamContext {
  generatedAt: string;
  totalEmployees: number;
  workloads: EmployeeWorkload[];
  overdueTasks: Array<{
    id: string;
    name: string;
    dueDate: string;
    assignees: string[];
    priority: string;
    daysOverdue: number;
  }>;
  urgentTasks: Array<{
    id: string;
    name: string;
    dueDate: string;
    assignees: string[];
    priority: string;
    daysUntilDue: number;
  }>;
  summary: {
    overdueCount: number;
    urgentCount: number;
    overloadedEmployees: string[];
    unassignedTaskCount: number;
  };
}

export interface AIRecommendation {
  id: string;
  type: 'risk_alert' | 'reassign_task' | 'timeline_adjustment';
  description: string;
  reasoning: string;
  suggested_action: {
    taskId?: string;
    newAssigneeId?: string;
    newDeadline?: string;
    affectedEmployeeId?: string;
    [key: string]: unknown;
  };
  status: 'pending' | 'approved' | 'rejected';
}
