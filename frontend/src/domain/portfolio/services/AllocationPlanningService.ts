// @ts-nocheck
import { ETF_INVESTMENT_TYPES, GLOBAL_ASSET_CLASSES, STOCK_SUBCATEGORIES } from '../constants.js';
import { globalAssetClass } from '../classification.js';
import { buildCurrentSnapshot } from '../snapshot.js';

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
    const currentEntries = buildCurrentSnapshot(
      entries.filter(
        (entry) => ETF_INVESTMENT_TYPES.includes(entry.type) && STOCK_SUBCATEGORIES.includes(entry.subcategory)
      )
    );
    const aggregates = Object.fromEntries(
      STOCK_SUBCATEGORIES.map((subcategory) => [subcategory, { currentValue: 0, latestDate: null }])
    );
    currentEntries.forEach((entry) => {
      const aggregate = aggregates[entry.subcategory];
      aggregate.currentValue += Number(entry.valuePln);
      if (!aggregate.latestDate || entry.date > aggregate.latestDate) aggregate.latestDate = entry.date;
    });
    const total = Object.values(aggregates).reduce((sum, aggregate) => sum + aggregate.currentValue, 0);
    return {
      total,
      rows: STOCK_SUBCATEGORIES.map((subcategory) => ({
        subcategory,
        currentValue: aggregates[subcategory].currentValue,
        targetWeight: Number(targets[subcategory] || 0),
        latestDate: aggregates[subcategory].latestDate
      }))
    };
  }
});
