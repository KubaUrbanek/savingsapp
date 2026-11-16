import test from 'node:test';
import assert from 'node:assert/strict';
import { planRebalancing } from '../../src/domain/portfolio/services/CurrentPortfolioRebalancing.js';
const global = { BONDS: 50, STOCKS: 50 };
const equity = { GOLD: 50, RYNKI_ROZWINIETE: 35, RYNKI_ROZWIJAJACE_SIE: 15 };
const entry = (valuePln, subcategory, type = 'GIELDA', owner = 'jakub', date = '2026-01-01') => ({
  valuePln,
  subcategory,
  type,
  owner,
  date,
  createdAt: `${date}T00:00:00Z`
});
const holdings = [
  entry(7000, 'TRZYLETNIE', 'OBLIGACJE'),
  entry(1000, 'ZLOTO'),
  entry(1500, 'RYNKI_ROZWINIETE'),
  entry(500, 'RYNKI_ROZWIJAJACE_SIE')
];
test('specification example balances trades and gives signed deviations and actual final weights', () => {
  const result = planRebalancing(holdings, global, equity);
  assert.deepEqual(
    result.rows.map((r) => r.tradeAmount),
    [-2000, 1500, 250, 250]
  );
  assert.deepEqual(
    result.rows.map((r) => r.deviation),
    [20, -15, -2.5, -2.5]
  );
  assert.deepEqual(
    result.rows.map((r) => r.afterValue),
    [5000, 2500, 1750, 750]
  );
  assert.equal(result.tradeTotal, 2000);
  assert.equal(result.total, 10000);
  assert.equal(
    planRebalancing(
      holdings.map((e, i) => ({ ...e, valuePln: result.rows[i].afterValue })),
      global,
      equity
    ).tradeTotal,
    0
  );
});
test('latest valuations, different accounts and owners aggregate; cash and unknown assets stay separate', () => {
  const result = planRebalancing(
    [
      ...holdings,
      entry(8000, 'TRZYLETNIE', 'OBLIGACJE', 'jakub', '2026-02-01'),
      entry(100, 'ZLOTO', 'IKE'),
      entry(200, 'ZLOTO', 'IKZE', 'zosia'),
      entry(300, null, 'KONTO_BANKOWE'),
      entry(400, null, 'PPK')
    ],
    global,
    equity
  );
  assert.equal(result.total, 11300);
  assert.equal(result.rows[0].currentValue, 8000);
  assert.equal(result.rows[1].currentValue, 1300);
  assert.equal(result.cash, 300);
  assert.equal(result.unclassified, 400);
});
test('zero target liquidates a holding and missing categories can be purchased', () => {
  const result = planRebalancing([entry(100, 'ZLOTO')], { BONDS: 100, STOCKS: 0 }, equity);
  assert.deepEqual(
    result.rows.map((r) => r.tradeAmount),
    [100, -100, 0, 0]
  );
});
test('empty investment portfolio has undefined percentages and no trades', () => {
  const result = planRebalancing([entry(100, null, 'KONTO_BANKOWE')], global, equity);
  assert.equal(result.total, 0);
  assert.equal(result.tradeTotal, 0);
  assert.ok(result.rows.every((r) => r.currentWeight === null && r.deviation === null && r.afterWeight === null));
});
test('rounding conserves cents across small portfolios and fractional targets', () => {
  for (let cents = 1; cents < 500; cents++) {
    const result = planRebalancing([entry(cents / 100, 'ZLOTO')], global, equity);
    assert.equal(
      result.rows.reduce((s, r) => s + Math.round(r.tradeAmount * 100), 0),
      0
    );
    assert.equal(
      result.rows.reduce((s, r) => s + Math.round(r.afterValue * 100), 0),
      cents
    );
    assert.ok(
      result.rows.every(
        (r) => r.afterValue >= 0 && Math.abs(r.afterValue * 100 - (cents * r.targetWeight) / 100) < 1.000001
      )
    );
  }
  assert.deepEqual(
    planRebalancing([entry(0.01, 'ZLOTO')], global, equity).rows.map((r) => r.afterValue),
    [0.01, 0, 0, 0]
  );
});
test('invalid weights, negative values and unsafe cents are rejected', () => {
  for (const value of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => planRebalancing([entry(value, 'ZLOTO')], global, equity));
  }
  assert.throws(() => planRebalancing([], { BONDS: 20, STOCKS: 20 }, equity));
  assert.throws(() =>
    planRebalancing(
      [entry(Number.MAX_SAFE_INTEGER / 100, 'ZLOTO'), entry(Number.MAX_SAFE_INTEGER / 100, 'TRZYLETNIE', 'OBLIGACJE')],
      global,
      equity
    )
  );
});
