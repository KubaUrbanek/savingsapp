/**
 * Port for preferences that are not part of the portfolio domain.
 * Implementations return FALLBACK_USERS[0] and DEFAULT_HOUSEHOLD_GOAL when a
 * preference has never been stored.
 * @interface
 */
export class UserPreferenceRepository {
  getSelectedOwner() { throw new Error('UserPreferenceRepository.getSelectedOwner is not implemented'); }
  setSelectedOwner(_owner) { throw new Error('UserPreferenceRepository.setSelectedOwner is not implemented'); }
  getHouseholdGoal() { throw new Error('UserPreferenceRepository.getHouseholdGoal is not implemented'); }
  setHouseholdGoal(_goal) { throw new Error('UserPreferenceRepository.setHouseholdGoal is not implemented'); }
}
