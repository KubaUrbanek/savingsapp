// @ts-nocheck
import { snapshotKey } from './snapshot.js';

const monthKey = (date) => date.slice(0, 7);
const yearKey = (date) => date.slice(0, 4);
const monthLabel = (key) => {
  const [year, month] = key.split('-');
  return new Intl.DateTimeFormat('pl-PL', { month: 'short', year: 'numeric' }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
};

export function buildSummary(entries, period) {
  const keyFor = period === 'yearly' ? yearKey : monthKey;
  const labelFor = period === 'yearly' ? (key) => key : monthLabel;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const keys = [...new Set(sorted.map((entry) => keyFor(entry.date)))].sort();
  const latest = {};
  const totals = [];
  let entryIndex = 0;
  return keys.map((key, index) => {
    while (entryIndex < sorted.length && keyFor(sorted[entryIndex].date) <= key) {
      latest[snapshotKey(sorted[entryIndex])] = sorted[entryIndex++];
    }
    const total = Object.values(latest).reduce((sum, entry) => sum + Number(entry.valuePln), 0);
    const previous = index ? totals[index - 1] : null;
    const changeAmount = previous === null ? 0 : total - previous;
    totals[index] = total;
    return {
      key,
      label: labelFor(key),
      total,
      changeAmount,
      changePercent: previous > 0 ? (changeAmount / previous) * 100 : null
    };
  });
}
