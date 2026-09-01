// @ts-nocheck
import { snapshotKey } from '../snapshot.js';

const periodKey = (date, period) => (period === 'yearly' ? date.slice(0, 4) : date.slice(0, 7));

export const TimeSeriesService = Object.freeze({
  generate(entries, period = 'monthly') {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const keys = [...new Set(sorted.map((entry) => periodKey(entry.date, period)))].sort();
    const latest = {};
    const totals = [];
    let entryIndex = 0;
    return keys.map((key, index) => {
      while (entryIndex < sorted.length && periodKey(sorted[entryIndex].date, period) <= key)
        latest[snapshotKey(sorted[entryIndex])] = sorted[entryIndex++];
      const total = Object.values(latest).reduce((sum, entry) => sum + Number(entry.valuePln), 0);
      const previous = index ? totals[index - 1] : null;
      const changeAmount = previous === null ? 0 : total - previous;
      totals[index] = total;
      return { key, total, changeAmount, changePercent: previous > 0 ? (changeAmount / previous) * 100 : null };
    });
  }
});
