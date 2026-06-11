import { getSupabaseClient } from '@/lib/supabase/client';

interface LogParams {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

export async function logActivity({ userId, action, entityType, entityId, oldData, newData }: LogParams) {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData || null,
      new_data: newData || null,
    });
  } catch (err) {
    // Fire-and-forget: don't let logging errors break the main flow
    console.warn('Activity log error:', err);
  }
}
