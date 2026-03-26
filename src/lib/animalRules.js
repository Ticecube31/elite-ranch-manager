/**
 * Central animal type / sex validation rules.
 * Used by every form and API call that creates or edits an Animal.
 */

export const MALE_TYPES   = ['Bull', 'Calf - Steer'];
export const FEMALE_TYPES = ['Cow', '1st Calf Heifer', 'Calf - Heifer'];
export const ALL_TYPES    = ['Cow', '1st Calf Heifer', 'Calf - Heifer', 'Bull', 'Calf - Steer'];

/** Returns the allowed AnimalType values for a given sex */
export function allowedTypesForSex(sex) {
  if (sex === 'Male')   return MALE_TYPES;
  if (sex === 'Female') return FEMALE_TYPES;
  return ALL_TYPES;
}

/**
 * Returns a human-readable error string if the sex/type combo is invalid,
 * or null if valid.
 */
export function validateSexType(sex, animalType) {
  if (!sex || !animalType) return null; // missing — caught elsewhere
  if (sex === 'Male'   && FEMALE_TYPES.includes(animalType))
    return `Males cannot be ${animalType}.`;
  if (sex === 'Female' && MALE_TYPES.includes(animalType))
    return `Females cannot be ${animalType}.`;
  return null;
}

/** Returns true if a given animal record can be a mother (Cow or 1st Calf Heifer) */
export function isValidMother(animal) {
  return animal?.sex === 'Female' && ['Cow', '1st Calf Heifer'].includes(animal?.animal_type);
}

/** Role permission checks */
export const ROLES = {
  Owner:     { canDelete: true,  canEdit: true,  canCreate: true,  canViewAudit: true  },
  Manager:   { canDelete: false, canEdit: true,  canCreate: true,  canViewAudit: true  },
  RanchHand: { canDelete: false, canEdit: false, canCreate: true,  canViewAudit: false },
};

export function getPermissions(role) {
  return ROLES[role] ?? ROLES['RanchHand'];
}