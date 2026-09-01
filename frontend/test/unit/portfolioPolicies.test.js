import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCurrentSnapshot } from '../../src/domain/portfolio/snapshot.js';
import { buildSummary } from '../../src/domain/portfolio/summary.js';
import { buildGlobalAllocation, normalizeGlobalAllocations } from '../../src/domain/portfolio/allocation.js';

const entry = (owner, type, valuePln, date, createdAt = `${date}T10:00:00Z`) => ({
  owner,
  type,
  subcategory: null,
  valuePln,
  date,
  createdAt
});

test('snapshot selects the newest valuation and uses creation time as a tie breaker', () => {
  const old = entry('JAN', 'OBLIGACJE', 100, '2026-01-01');
  const latest = entry('JAN', 'OBLIGACJE', 120, '2026-02-01');
  assert.deepEqual(buildCurrentSnapshot([latest, old]), [latest]);
});

test('historical summaries carry snapshots forward and calculate changes', () => {
  const result = buildSummary(
    [entry('JAN', 'OBLIGACJE', 100, '2026-01-01'), entry('JAN', 'OBLIGACJE', 125, '2026-02-01')],
    'monthly'
  );
  assert.deepEqual(
    result.map(({ key, total, changeAmount, changePercent }) => ({ key, total, changeAmount, changePercent })),
    [
      { key: '2026-01', total: 100, changeAmount: 0, changePercent: null },
      { key: '2026-02', total: 125, changeAmount: 25, changePercent: 25 }
    ]
  );
});

test('allocation validation replaces invalid boundaries with documented defaults', () => {
  assert.deepEqual(normalizeGlobalAllocations({ BONDS: -1, STOCKS: 40, GOLD: Number.NaN }), {
    BONDS: 50,
    STOCKS: 40,
    GOLD: 20
  });
});

test('contribution-only rebalancing never sells an overweight asset', () => {
  const allocation = buildGlobalAllocation(
    [
      { ...entry('JAN', 'OBLIGACJE', 80, '2026-01-01'), subcategory: 'TRZYLETNIE' },
      { ...entry('JAN', 'GIELDA', 20, '2026-01-01'), subcategory: 'RYNKI_ROZWINIETE' }
    ],
    { BONDS: 50, STOCKS: 50, GOLD: 0 }
  );
  assert.equal(allocation.rows.find((row) => row.assetClass === 'BONDS').contributionAmount, 0);
  assert.equal(allocation.rows.find((row) => row.assetClass === 'STOCKS').contributionAmount, 60);
});
