import ActivityTimeline from "@/components/ActivityTimeline";

export default function ProjectActivityLog({ projectId }: { projectId: string }) {
  return <ActivityTimeline entityType="project" entityId={projectId} />;
}
