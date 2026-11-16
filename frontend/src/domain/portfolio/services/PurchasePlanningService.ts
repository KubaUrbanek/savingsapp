// @ts-nocheck
import { buildCurrentSnapshot } from '../snapshot.js';
import { percentageTotal, moneyInput } from '../decimal.js';
import { globalAssetClass } from '../classification.js';
export function validWeights(weights, keys = Object.keys(weights)) {
  return percentageTotal(keys.map((key) => weights[key])) === '100';
}
/** Water filling minimizes underweight positions without sales; round down then distribute cents. */
export function allocatePurchases(rows, budget) {
  if (moneyInput(budget) == null) throw new RangeError('Nieprawidłowy budżet');
  if (!validWeights(Object.fromEntries(rows.map((r) => [r.key, r.targetWeight]))))
    throw new RangeError('Wagi muszą sumować się do 100%');
  rows = rows.map((row) => ({ ...row, targetWeight: Number(row.targetWeight) }));
  const cents = Math.round(budget * 100);
  let low = 0,
    high = rows.reduce((s, r) => s + r.currentValue, 0) + budget + 1;
  const amount = (t) => rows.reduce((s, r) => s + Math.max(0, (t * r.targetWeight) / 100 - r.currentValue), 0);
  while (amount(high) < budget) high *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    if (amount(mid) < budget) low = mid;
    else high = mid;
  }
  const purchases = rows.map((r) => ({ ...r, raw: Math.max(0, (high * r.targetWeight) / 100 - r.currentValue) * 100 }));
  purchases.forEach((r) => (r.cents = Math.floor(r.raw + 1e-8)));
  let remaining = cents - purchases.reduce((s, r) => s + r.cents, 0);
  const order = [...purchases].filter((r) => r.targetWeight > 0).sort((a, b) => b.raw - b.cents - (a.raw - a.cents));
  for (let i = 0; remaining > 0; i++, remaining--) order[i % order.length].cents++;
  for (let i = 0; remaining < 0; i++) {
    const row = order[i % order.length];
    if (row.cents > 0) {
      row.cents--;
      remaining++;
    }
  }
  return purchases.map(({ raw, cents, ...r }) => ({
    ...r,
    purchaseAmount: cents / 100,
    afterValue: r.currentValue + cents / 100
  }));
}
export function planPurchases(entries, global, equity, budget) {
  return planFlatPurchases(
    entries,
    {
      BONDS: Number(global.BONDS),
      GOLD: (Number(global.STOCKS) * Number(equity.GOLD)) / 100,
      RYNKI_ROZWINIETE: (Number(global.STOCKS) * Number(equity.RYNKI_ROZWINIETE)) / 100,
      RYNKI_ROZWIJAJACE_SIE: (Number(global.STOCKS) * Number(equity.RYNKI_ROZWIJAJACE_SIE)) / 100
    },
    budget
  );
}
export function planFlatPurchases(entries, weights, budget) {
  const values = { BONDS: 0, GOLD: 0, RYNKI_ROZWINIETE: 0, RYNKI_ROZWIJAJACE_SIE: 0 };
  let cash = 0,
    unclassified = 0;
  buildCurrentSnapshot(entries).forEach((e) => {
    const c = globalAssetClass(e);
    if (c === 'CASH') cash += Number(e.valuePln);
    else if (c === 'UNCLASSIFIED') unclassified += Number(e.valuePln);
    else values[c === 'STOCKS' ? e.subcategory : c] += Number(e.valuePln);
  });
  const total = Object.values(values).reduce((s, v) => s + v, 0),
    afterTotal = total + budget;
  const rows = allocatePurchases(
    Object.keys(values).map((key) => ({ key, currentValue: values[key], targetWeight: weights[key] })),
    budget
  ).map((r) => ({
    ...r,
    currentWeight: total ? (r.currentValue / total) * 100 : 0,
    missingAmount: Math.max(0, (total * r.targetWeight) / 100 - r.currentValue),
    afterWeight: afterTotal ? (r.afterValue / afterTotal) * 100 : 0
  }));
  return { rows, total, cash, unclassified, budget };
}
