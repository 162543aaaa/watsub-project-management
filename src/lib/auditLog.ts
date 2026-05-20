import { supabase } from "@/integrations/supabase/client";

export type EntityType = "task" | "project" | "customer";

export interface LogAuditParams {
  userId: string | null;
  action: string;
  entityType: EntityType | string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

/**
 * Insert a row in `audit_logs`. Failures are swallowed so they never block
 * the main mutation flow.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Compute the action label for a task update, capturing status transitions
 * with a `status_changed:From→To` convention so the activity log can parse
 * them later.
 */
export function taskUpdateAction(oldStatus: string | undefined, newStatus: string | undefined): string {
  if (newStatus && oldStatus && newStatus !== oldStatus) {
    return `status_changed:${oldStatus}→${newStatus}`;
  }
  return "updated";
}