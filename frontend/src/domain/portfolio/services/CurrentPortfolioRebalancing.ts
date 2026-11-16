// @ts-nocheck
import { decimalText, moneyInput } from '../decimal.js';
import { planningSnapshot } from './PurchasePlanningService.js';

/** Rebalance the same four investment buckets as purchase planning, conserving every cent. */
export function planRebalancing(entries, global, equity) {
  const snapshot = planningSnapshot(entries, global, equity);
  const currentCents = snapshot.rows.map((row) => Math.round(row.currentValue * 100));
  const totalCents = currentCents.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(totalCents)) throw new RangeError('Nieprawidłowa wartość portfela');
  // Keep high-precision persisted weights and large monetary values exact during apportionment.
  const texts = snapshot.rows.map((row) => decimalText(row.targetWeight));
  const scale = Math.max(0, ...texts.map((text) => text.split('.')[1]?.length ?? 0));
  const weights = texts.map((text) =>
    BigInt(text.replace('.', '') + '0'.repeat(scale - (text.split('.')[1]?.length ?? 0)))
  );
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0n);
  const numerators = weights.map((weight) => BigInt(totalCents) * weight);
  const targets = numerators.map((value) => Number(value / weightTotal));
  const remainders = numerators.map((value) => value % weightTotal);
  const order = weights
    .map((weight, index) => index)
    .filter((index) => weights[index] > 0n)
    .sort((a, b) => (remainders[a] === remainders[b] ? a - b : remainders[a] > remainders[b] ? -1 : 1));
  const remaining = totalCents - targets.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < remaining; i++) targets[order[i]]++;
  if (targets.some((value) => moneyInput(value / 100) == null)) throw new RangeError('Nieprawidłowa wartość portfela');
  const rows = snapshot.rows.map((row, index) => ({
    ...row,
    targetWeight: Number(row.targetWeight),
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
