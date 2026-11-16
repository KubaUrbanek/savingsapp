// @ts-nocheck
import { planningSnapshot } from './PurchasePlanningService.js';

/** Rebalance the same four investment buckets as purchase planning, conserving every cent. */
export function planRebalancing(entries, global, equity) {
  const snapshot = planningSnapshot(entries, global, equity);
  const currentCents = snapshot.rows.map((row) => Math.round(row.currentValue * 100));
  const totalCents = currentCents.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(totalCents)) throw new RangeError('Nieprawidłowa wartość portfela');
  const weightTotal = snapshot.rows.reduce((sum, row) => sum + row.targetWeight, 0);
  const raw = snapshot.rows.map((row) => totalCents * (row.targetWeight / weightTotal));
  const targets = raw.map(Math.floor);
  const order = snapshot.rows
    .map((row, index) => index)
    .filter((index) => snapshot.rows[index].targetWeight > 0)
    .sort((a, b) => raw[b] - targets[b] - (raw[a] - targets[a]) || a - b);
  const remaining = totalCents - targets.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < remaining; i++) targets[order[i % order.length]]++;
  const rows = snapshot.rows.map((row, index) => ({
    ...row,
    currentValue: currentCents[index] / 100,
    currentWeight: totalCents ? (currentCents[index] / totalCents) * 100 : null,
    deviation: totalCents ? (currentCents[index] / totalCents) * 100 - row.targetWeight : null,
    deviationAmount: (currentCents[index] - targets[index]) / 100,
    tradeAmount: (targets[index] - currentCents[index]) / 100,
    afterValue: targets[index] / 100,
    afterWeight: totalCents ? (targets[index] / totalCents) * 100 : null
  }));
  return {
    ...snapshot,
    total: totalCents / 100,
    rows,
    tradeTotal: rows.reduce((sum, row, index) => sum + Math.max(0, targets[index] - currentCents[index]), 0) / 100
  };
}
