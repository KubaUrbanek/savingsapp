// @ts-nocheck
import {
  DEFAULT_GLOBAL_TARGET_ALLOCATIONS,
  DEFAULT_STOCK_TARGET_ALLOCATIONS,
  GLOBAL_ASSET_CLASSES,
  STOCK_SUBCATEGORIES
} from './constants.js';
import { globalAssetClass } from './classification.js';
import { buildCurrentSnapshot, isNewerEntry } from './snapshot.js';
import { AllocationPlanningService } from './services/AllocationPlanningService.js';
import { RebalancingService } from './services/RebalancingService.js';

export function normalizeStockAllocations(weights) {
  return STOCK_SUBCATEGORIES.reduce((result, key) => {
    const value = Number(weights?.[key]);
    result[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_STOCK_TARGET_ALLOCATIONS[key];
    return result;
  }, {});
}
export const allocationTotal = (weights) =>
  STOCK_SUBCATEGORIES.reduce((sum, key) => sum + Number(weights[key] || 0), 0);
export function normalizeGlobalAllocations(weights) {
  return GLOBAL_ASSET_CLASSES.reduce((result, key) => {
    const value = Number(weights?.[key]);
    result[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_GLOBAL_TARGET_ALLOCATIONS[key];
    return result;
  }, {});
}
export { globalAssetClass } from './classification.js';
export function buildGlobalAllocation(entries, targets) {
  return RebalancingService.global(AllocationPlanningService.global(entries, targets));
}
export function buildStockAllocation(entries, targets, contribution = 0) {
  return RebalancingService.stocks(AllocationPlanningService.stocks(entries, targets), contribution);
}
