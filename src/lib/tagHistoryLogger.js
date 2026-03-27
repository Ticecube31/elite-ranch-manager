import { base44 } from '@/api/base44Client';

/**
 * Log a tag number change to the TagHistory table.
 * Call this whenever an animal's tag_number is set or changed.
 */
export async function logTagHistory({ animalId, oldTagNumber, newTagNumber, reason, user }) {
  if (!animalId || !newTagNumber) return;
  // Only log if something actually changed (or it's an initial assignment)
  if (oldTagNumber !== undefined && oldTagNumber === newTagNumber) return;

  await base44.entities.TagHistory.create({
    animal_id:      animalId,
    old_tag_number: oldTagNumber || null,
    new_tag_number: newTagNumber,
    change_date:    new Date().toISOString(),
    changed_by:     user?.email || 'unknown',
    reason:         reason || 'Tag change',
  });
}