// @ts-nocheck
/**
 * Port for target allocations. Missing values use the documented domain
 * defaults (40/30/30 for stocks and 50/30/20 globally).
 * @interface
 */
export class AllocationTargetRepository {
  getStockAllocation() {
    throw new Error('AllocationTargetRepository.getStockAllocation is not implemented');
  }
  setStockAllocation(_allocation) {
    throw new Error('AllocationTargetRepository.setStockAllocation is not implemented');
  }
  getGlobalAllocation() {
    throw new Error('AllocationTargetRepository.getGlobalAllocation is not implemented');
  }
  setGlobalAllocation(_allocation) {
    throw new Error('AllocationTargetRepository.setGlobalAllocation is not implemented');
  }
}
