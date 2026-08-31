import { CASH_TYPES, DEFAULT_GLOBAL_TARGET_ALLOCATIONS, DEFAULT_STOCK_TARGET_ALLOCATIONS, GLOBAL_ASSET_CLASSES, STOCK_SUBCATEGORIES } from './constants.js';
import { buildCurrentSnapshot, isNewerEntry } from './snapshot.js';

export function normalizeStockAllocations(weights) {
  return STOCK_SUBCATEGORIES.reduce((result, key) => {
    const value = Number(weights?.[key]);
    result[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_STOCK_TARGET_ALLOCATIONS[key];
    return result;
  }, {});
}
export const allocationTotal = (weights) => STOCK_SUBCATEGORIES.reduce((sum, key) => sum + Number(weights[key] || 0), 0);
export function normalizeGlobalAllocations(weights) {
  return GLOBAL_ASSET_CLASSES.reduce((result, key) => {
    const value = Number(weights?.[key]);
    result[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_GLOBAL_TARGET_ALLOCATIONS[key];
    return result;
  }, {});
}
export function globalAssetClass(entry) {
  if (CASH_TYPES.includes(entry.type)) return 'CASH';
  if (entry.type === 'OBLIGACJE') return 'BONDS';
  if (entry.subcategory === 'ZLOTO') return 'GOLD';
  return ['GIELDA', 'IKE', 'IKZE'].includes(entry.type) ? 'STOCKS' : 'CASH';
}
export function buildGlobalAllocation(entries, targets) {
  const values = buildCurrentSnapshot(entries).reduce((result, entry) => {
    const key = globalAssetClass(entry); result[key] = (result[key] || 0) + Number(entry.valuePln); return result;
  }, {});
  const investedTotal = GLOBAL_ASSET_CLASSES.reduce((sum, key) => sum + (values[key] || 0), 0);
  const requiredFinalTotal = GLOBAL_ASSET_CLASSES.reduce((minimum, key) => {
    const weight = Number(targets[key] || 0), value = values[key] || 0;
    return weight === 0 ? (value > 0 ? Infinity : minimum) : Math.max(minimum, value / (weight / 100));
  }, investedTotal);
  const rows = GLOBAL_ASSET_CLASSES.map((assetClass) => {
    const currentValue = values[assetClass] || 0, targetWeight = Number(targets[assetClass] || 0);
    const currentWeight = investedTotal ? currentValue / investedTotal * 100 : 0;
    return { assetClass, currentValue, currentWeight, targetWeight, deviation: currentWeight - targetWeight,
      rebalanceAmount: investedTotal * targetWeight / 100 - currentValue,
      contributionAmount: Number.isFinite(requiredFinalTotal) ? Math.max(0, requiredFinalTotal * targetWeight / 100 - currentValue) : null };
  });
  return { values, investedTotal, cashTotal: values.CASH || 0, requiredFinalTotal, contributionOnlyTotal: requiredFinalTotal - investedTotal, rows };
}
export function buildStockAllocation(entries, targets) {
  const latest = Object.fromEntries(STOCK_SUBCATEGORIES.map((key) => [key, null]));
  entries.filter((entry) => entry.type === 'GIELDA' && STOCK_SUBCATEGORIES.includes(entry.subcategory)).forEach((entry) => {
    if (isNewerEntry(entry, latest[entry.subcategory])) latest[entry.subcategory] = entry;
  });
  const total = Object.values(latest).reduce((sum, entry) => sum + Number(entry?.valuePln || 0), 0);
  return { total, rows: STOCK_SUBCATEGORIES.map((subcategory) => {
    const currentValue = Number(latest[subcategory]?.valuePln || 0), targetWeight = targets[subcategory];
    const targetValue = total * targetWeight / 100, difference = targetValue - currentValue;
    return { subcategory, currentValue, targetWeight, targetValue, difference,
      divergencePercent: targetValue > 0 ? difference / targetValue * 100 : null,
      currentWeight: total > 0 ? currentValue / total * 100 : 0, latestDate: latest[subcategory]?.date || null };
  }) };
}
