import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateHouseholdHoldings } from '../../src/domain/portfolio/services/HouseholdHoldingsAggregationService.js';
import { buildCurrentSnapshot } from '../../src/domain/portfolio/snapshot.js';
const holding = (owner, type, subcategory, valuePln, result, date = '2026-11-15') => ({
  owner,
  type,
  subcategory,
  valuePln,
  date,
  createdAt: `${date}T00:00:00Z`,
  performance: { nominalResultPln: result, contributedCapitalPln: result == null ? null : valuePln - result }
});
test('sums owners and wrappers while retaining distinct investments and valuation dates', () => {
  const rows = aggregateHouseholdHoldings([
    holding('jakub', 'PPK', null, 64611.34, 41527.2),
    holding('zosia', 'PPK', null, 11195.51, 6135.89),
    holding('jakub', 'OBLIGACJE', 'TRZYLETNIE', 23983.62, 1783.62),
    holding('zosia', 'OBLIGACJE', 'TRZYLETNIE', 150222.85, 9722.85),
    holding('jakub', 'IKZE', 'ZLOTO', 4836, 436.11, '2026-10-18'),
    holding('zosia', 'IKE', 'ZLOTO', 9590.54, -777.41),
    holding('jakub', 'PPO', null, 10, 0),
    holding('jakub', 'IKE', 'DZIESIECIOLETNIE', 10, 0)
  ]);
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.slice(0, 3).map((row) => row.valuePln.toFixed(2)),
    ['75806.85', '174206.47', '14426.54']
  );
  assert.equal(rows[2].performance.nominalResultPln.toFixed(2), '-341.30');
  assert.equal(rows[2].date, '2026-10-18 – 2026-11-15');
  assert.ok(rows.every((row) => !('owner' in row)));
});
test('propagates unknown results, preserves zero and handles empty holdings', () => {
  const rows = aggregateHouseholdHoldings([
    holding('jakub', 'IKE', 'ZLOTO', 20, 2),
    holding('zosia', 'IKZE', 'ZLOTO', 0, null),
    holding('jakub', 'PPK', null, 0, 0)
  ]);
  assert.equal(rows[0].valuePln, 20);
  assert.equal(rows[0].performance.nominalResultPln, null);
  assert.equal(rows[0].performance.contributedCapitalPln, null);
  assert.equal(rows[1].performance.nominalResultPln, 0);
  assert.deepEqual(aggregateHouseholdHoldings([]), []);
  assert.equal(
    aggregateHouseholdHoldings([{ type: 'PPK', valuePln: 0, date: '2026-11-15' }])[0].performance.nominalResultPln,
    null
  );
});
test('uses latest snapshots per owner before combining accounts', () => {
  const entries = [
    holding('jakub', 'IKE', 'ZLOTO', 100, 10, '2026-10-18'),
    holding('jakub', 'IKE', 'ZLOTO', 200, 20),
    holding('zosia', 'IKZE', 'ZLOTO', 300, 30)
  ];
  assert.equal(aggregateHouseholdHoldings(buildCurrentSnapshot(entries))[0].valuePln, 500);
});
