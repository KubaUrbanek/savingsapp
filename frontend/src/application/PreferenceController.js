export class PreferenceController {
  constructor(repository) { this.repository = repository; }
  selectedOwner() { return this.repository.getSelectedOwner(); }
  selectOwner(owner) { this.repository.setSelectedOwner(owner); }
  householdGoal() { return this.repository.getHouseholdGoal(); }
  changeHouseholdGoal(goal) { this.repository.setHouseholdGoal(goal); }
  stockAllocation() { return this.repository.getStockAllocation(); }
  changeStockAllocation(allocation) { this.repository.setStockAllocation(allocation); }
  globalAllocation() { return this.repository.getGlobalAllocation(); }
  changeGlobalAllocation(allocation) { this.repository.setGlobalAllocation(allocation); }
}
