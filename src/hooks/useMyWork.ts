import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Task } from "@/hooks/useProjects";
import { bucketMyTasks, type EnrichedTask } from "@/lib/myWorkAggregation";

export type MyWorkTask = EnrichedTask;

export function useMyWork() {
  const { user } = useAuthContext();
  const { employees } = useEmployees();
  const { tasks, loading: lt } = useTasks();
  const { projects, loading: lp } = useProjects("all");
  const { customers, loading: lc } = useCustomers("all");

  const me = useMemo(
    () =>
      employees.find(
        (e) => user?.email && e.email?.toLowerCase() === user.email.toLowerCase(),
      ),
    [employees, user],
  );

  const myName = me?.name;

  const myTasks = useMemo<EnrichedTask[]>(() => {
    if (!myName) return [];
    const all: EnrichedTask[] = [
      ...tasks.map((t) => enrich(t, "standalone")),
      ...projects.flatMap((p) =>
        p.tasks.map((t) => enrich(t, "project", p.name, p.id)),
      ),
      ...customers.flatMap((c) =>
        c.tasks.map((t) => enrich(t, "customer", c.name, c.id)),
      ),
    ];
    return all.filter((t) => t.assigned_to?.includes(myName));
  }, [tasks, projects, customers, myName]);

  const sections = useMemo(() => bucketMyTasks(myTasks), [myTasks]);

  return {
    employee: me,
    myName,
    sections,
    loading: lt || lp || lc,
    totalAssigned: myTasks.length,
  };
}

function enrich(
  t: Task,
  source: EnrichedTask["_source"],
  sourceName?: string,
  sourceId?: string,
): EnrichedTask {
  return { ...t, _source: source, _sourceName: sourceName, _sourceId: sourceId };
}