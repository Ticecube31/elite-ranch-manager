import { base44 } from '@/api/base44Client';

/**
 * Logs a data change to the DataChangeLog entity
 * @param {string} ranchId - Ranch ID
 * @param {string} userEmail - Email of user who made the change
 * @param {string} userFullName - Full name of user
 * @param {string} action - 'create', 'update', or 'delete'
 * @param {string} entityType - Type of entity (Animal, Pasture, etc)
 * @param {string} entityId - ID of the entity
 * @param {string} entityLabel - Human-readable label
 * @param {object} oldValue - Previous value (for updates)
 * @param {object} newValue - New value (for updates)
 * @param {string} fieldChanged - Field that changed (for updates)
 * @param {string} changeSummary - Human-readable summary
 */
export async function logDataChange({
  ranchId,
  userEmail,
  userFullName,
  action,
  entityType,
  entityId,
  entityLabel,
  oldValue,
  newValue,
  fieldChanged,
  changeSummary,
}) {
  if (!ranchId || !userEmail) return;

  try {
    await base44.entities.DataChangeLog.create({
      ranch_id: ranchId,
      user_email: userEmail,
      user_full_name: userFullName || userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      field_changed: fieldChanged || null,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      change_summary: changeSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging data change:', error);
  }
}

/**
 * Get change logs for a ranch
 */
export async function getRanchChangeLog(ranchId, limit = 100) {
  try {
    const logs = await base44.entities.DataChangeLog.filter(
      { ranch_id: ranchId },
      '-timestamp',
      limit
    );
    return logs;
  } catch (error) {
    console.error('Error fetching change log:', error);
    return [];
  }
}