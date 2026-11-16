// @ts-nocheck
import { decimalText, moneyInput } from '../decimal.js';
import { planningSnapshot } from './PurchasePlanningService.js';

/** Rebalance the same four investment buckets as purchase planning, conserving every cent. */
export function planRebalancing(entries, global, equity, selectedKeys) {
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
  const apportion = (indices, cents) => {
    const weightTotal = indices.reduce((sum, index) => sum + weights[index], 0n);
    if (weightTotal === 0n) return null;
    const numerators = weights.map((weight) => BigInt(cents) * weight);
    const targets = [...currentCents];
    indices.forEach((index) => (targets[index] = Number(numerators[index] / weightTotal)));
    const order = indices
      .filter((index) => weights[index] > 0n)
      .sort((a, b) => {
        const left = numerators[a] % weightTotal,
          right = numerators[b] % weightTotal;
        return left === right ? a - b : left > right ? -1 : 1;
      });
    const remaining = cents - indices.reduce((sum, index) => sum + targets[index], 0);
    for (let i = 0; i < remaining; i++) targets[order[i]]++;
    return targets;
  };
  const all = snapshot.rows.map((row, index) => index);
  const selected = selectedKeys == null ? all : all.filter((index) => selectedKeys.includes(snapshot.rows[index].key));
  if (selectedKeys?.some((key) => !snapshot.rows.some((row) => row.key === key)))
    throw new RangeError('Nieznane aktywo');
  const selectedCents = selected.reduce((sum, index) => sum + currentCents[index], 0);
  const fullTargets = apportion(all, totalCents);
  const selectedTargets = apportion(selected, selectedCents);
  const targets = selectedTargets ?? currentCents;
  const selectionStatus =
    selected.length === 0
      ? 'empty'
      : !selectedTargets
        ? 'zero-target'
        : selected.length === 1
          ? 'single'
          : selectedCents === 0
            ? 'no-funds'
            : 'ready';
  if (targets.some((value) => moneyInput(value / 100) == null)) throw new RangeError('Nieprawidłowa wartość portfela');
  const rows = snapshot.rows.map((row, index) => ({
    ...row,
    targetWeight: Number(row.targetWeight),
    currentValue: currentCents[index] / 100,
    currentWeight: totalCents ? (currentCents[index] / totalCents) * 100 : null,
    deviation: totalCents ? (currentCents[index] / totalCents) * 100 - row.targetWeight : null,
    deviationAmount: (currentCents[index] - fullTargets[index]) / 100,
    selected: selected.includes(index),
    tradeAmount: (targets[index] - currentCents[index]) / 100,
    afterValue: targets[index] / 100,
    afterWeight: totalCents ? (targets[index] / totalCents) * 100 : null
  }));
  return {
    ...snapshot,
    total: totalCents / 100,
    selectedTotal: selectedCents / 100,
    excludedTotal: (totalCents - selectedCents) / 100,
    partial: selected.length !== all.length,
    selectionStatus,
    rows,
    tradeTotal: rows.reduce((sum, row, index) => sum + Math.max(0, targets[index] - currentCents[index]), 0) / 100
  };
}
