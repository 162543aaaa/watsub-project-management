import ActivityTimeline from "@/components/ActivityTimeline";

export default function TaskActivityLog({ taskId }: { taskId: string }) {
  return <ActivityTimeline entityType="task" entityId={taskId} />;
}
