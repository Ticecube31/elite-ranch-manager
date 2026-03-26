/**
 * Lightweight audit logger — writes to the AuditLog entity.
 * Call this after every create / update / delete operation.
 */
import { base44 } from '@/api/base44Client';

export async function logAudit({ action, entityType, entityId, entityLabel, changeSummary, previousValue, newValue, user }) {
  try {
    await base44.entities.AuditLog.create({
      action,
      entity_type:     entityType,
      entity_id:       String(entityId),
      entity_label:    entityLabel ?? '',
      changed_by:      user?.email ?? 'unknown',
      changed_by_name: user?.full_name ?? '',
      change_summary:  changeSummary ?? '',
      previous_value:  previousValue ? JSON.stringify(previousValue) : '',
      new_value:       newValue       ? JSON.stringify(newValue)       : '',
    });
  } catch {
    // audit logging should never break the main flow
  }
}