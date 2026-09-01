// @ts-nocheck
import { GLOBAL_ASSET_CLASSES, STOCK_SUBCATEGORIES } from '../constants.js';
import { globalAssetClass } from '../classification.js';
import { buildCurrentSnapshot, isNewerEntry } from '../snapshot.js';

/** Pure portfolio allocation calculations. */
export const AllocationPlanningService = Object.freeze({
  global(entries, targets) {
    const values = buildCurrentSnapshot(entries).reduce((result, entry) => {
      const key = globalAssetClass(entry);
      result[key] = (result[key] || 0) + Number(entry.valuePln);
      return result;
    }, {});
    const investedTotal = GLOBAL_ASSET_CLASSES.reduce((sum, key) => sum + (values[key] || 0), 0);
    return {
      values,
      investedTotal,
      cashTotal: values.CASH || 0,
      rows: GLOBAL_ASSET_CLASSES.map((assetClass) => {
        const currentValue = values[assetClass] || 0;
        const targetWeight = Number(targets[assetClass] || 0);
        return {
          assetClass,
          currentValue,
          currentWeight: investedTotal ? (currentValue / investedTotal) * 100 : 0,
          targetWeight
        };
      })
    };
  },
  stocks(entries, targets) {
    const latest = Object.fromEntries(STOCK_SUBCATEGORIES.map((key) => [key, null]));
    entries
      .filter((entry) => entry.type === 'GIELDA' && STOCK_SUBCATEGORIES.includes(entry.subcategory))
      .forEach((entry) => {
        if (isNewerEntry(entry, latest[entry.subcategory])) latest[entry.subcategory] = entry;
      });
    const total = Object.values(latest).reduce((sum, entry) => sum + Number(entry?.valuePln || 0), 0);
    return {
      total,
      rows: STOCK_SUBCATEGORIES.map((subcategory) => ({
        subcategory,
        currentValue: Number(latest[subcategory]?.valuePln || 0),
        targetWeight: Number(targets[subcategory] || 0),
        latestDate: latest[subcategory]?.date || null
      }))
    };
  }
});
