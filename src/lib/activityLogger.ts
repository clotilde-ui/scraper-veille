// Activity logger stub — Supabase removed, no activity_logs table in Turso
// Fire-and-forget: silently no-ops so existing callers don't break

interface LogParams {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

export async function logActivity(_params: LogParams): Promise<void> {
  // No-op: activity logging removed with Supabase migration
}
