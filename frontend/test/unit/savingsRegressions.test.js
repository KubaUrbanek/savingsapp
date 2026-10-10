import test from 'node:test';
import assert from 'node:assert/strict';
import { allocatePurchases, planPurchases } from '../../src/domain/portfolio/services/PurchasePlanningService.js';
import { aggregatePerformance } from '../../src/domain/portfolio/services/PerformanceAggregationService.js';
import { mapPerformanceDto } from '../../src/infrastructure/http/dtoMapper.js';
import { FetchPortfolioCommandGateway } from '../../src/infrastructure/http/FetchPortfolioCommandGateway.js';
import { mapPortfolioChangeForm } from '../../src/presentation/mappers/portfolioChangeFormMapper.js';
import { InvestmentClassificationPolicy } from '../../src/domain/portfolio/classification.js';
import { LocalStoragePreferenceRepository } from '../../src/infrastructure/storage/LocalStoragePreferenceRepository.js';
const entries = [
  ['GIELDA', 'ZLOTO', 200],
  ['GIELDA', 'RYNKI_ROZWINIETE', 1100],
  ['GIELDA', 'RYNKI_ROZWIJAJACE_SIE', 500],
  ['OBLIGACJE', 'TRZYLETNIE', 2000]
].map(([type, subcategory, valuePln], i) => ({
  id: i,
  owner: 'jakub',
  type,
  subcategory,
  valuePln,
  date: '2026-10-10',
  createdAt: '2026-10-10T00:00:00Z'
}));

test('100 PLN budget always produces feasible purchases even with overweight holdings', () => {
  const rows = allocatePurchases(
    [
      { key: 'gold', currentValue: 200, targetWeight: 40 },
      { key: 'developed', currentValue: 1100, targetWeight: 30 },
      { key: 'emerging', currentValue: 500, targetWeight: 30 }
    ],
    100
  );
  assert.equal(
    rows.reduce((s, r) => s + Math.round(r.purchaseAmount * 100), 0),
    10000
  );
  assert.ok(rows.every((r) => r.purchaseAmount >= 0));
  assert.equal(rows.find((r) => r.key === 'developed').purchaseAmount, 0);
  assert.ok(rows.every((r) => r.afterValue === r.currentValue + r.purchaseAmount));
});
test('cent rounding conserves every tested budget across allocations, including zero targets', () => {
  for (let budget = 0; budget <= 103; budget++)
    for (const weights of [
      [50, 50, 0],
      [33.33, 33.33, 33.34],
      [0, 0, 100]
    ]) {
      const rows = allocatePurchases(
        weights.map((targetWeight, key) => ({ key, currentValue: key === 0 ? 10000 : key * 17, targetWeight })),
        budget / 100
      );
      assert.equal(
        rows.reduce((s, r) => s + Math.round(r.purchaseAmount * 100), 0),
        budget
      );
      assert.ok(rows.every((r) => r.purchaseAmount >= 0));
    }
});
test('two-level equity targets exclude gold and keep cash and unknown pension composition outside', () => {
  const plan = planPurchases(
    [
      ...entries,
      {
        id: 'ppk',
        owner: 'jakub',
        type: 'PPK',
        subcategory: null,
        valuePln: 300,
        date: '2026-10-10',
        createdAt: '2026-10-10T00:00:00Z'
      },
      {
        id: 'cash',
        owner: 'jakub',
        type: 'KONTO_BANKOWE',
        subcategory: null,
        valuePln: 400,
        date: '2026-10-10',
        createdAt: '2026-10-10T00:00:00Z'
      }
    ],
    { BONDS: 50, STOCKS: 50, GOLD: 0 },
    { RYNKI_ROZWINIETE: 70, RYNKI_ROZWIJAJACE_SIE: 30 },
    100
  );
  assert.deepEqual(
    plan.rows.map((r) => [r.key, r.targetWeight]),
    [
      ['BONDS', 50],
      ['GOLD', 0],
      ['RYNKI_ROZWINIETE', 35],
      ['RYNKI_ROZWIJAJACE_SIE', 15]
    ]
  );
  assert.equal(plan.cash, 400);
  assert.equal(plan.unclassified, 300);
  assert.equal(plan.total, 3800);
  assert.equal(InvestmentClassificationPolicy.globalAssetClass({ type: 'PPK', subcategory: null }), 'UNCLASSIFIED');
});
test('invalid weights and budgets never generate recommendations', () => {
  for (const weights of [
    [80, 30, 20],
    [-1, 51, 50],
    [101, 0, -1],
    [NaN, 50, 50]
  ])
    assert.throws(() =>
      allocatePurchases(
        weights.map((targetWeight, key) => ({ key, targetWeight, currentValue: 100 })),
        100
      )
    );
  for (const budget of [-1, NaN, Infinity])
    assert.throws(() => allocatePurchases([{ key: 'a', targetWeight: 100, currentValue: 100 }], budget));
});
test('unknown server result stays unknown instead of being coerced to zero', () => {
  assert.equal(mapPerformanceDto({ nominalResultPln: null, monthlyResultPln: null }).nominalResultPln, null);
  assert.equal(mapPerformanceDto({ nominalResultPln: null, monthlyResultPln: null }).monthlyResultPln, null);
  const p = aggregatePerformance([
    { currentValuePln: 500, nominalResultPln: null },
    { currentValuePln: 100, nominalResultPln: 10 }
  ]);
  assert.equal(p.currentValuePln, 600);
  assert.equal(p.nominalResultPln, null);
});
test('atomic adapter sends one request and reuses id after a lost response', async () => {
  const requests = [];
  let lost = true;
  const gateway = new FetchPortfolioCommandGateway(
    {
      json: async (path, options) => {
        requests.push({ path, options });
        if (lost) {
          lost = false;
          throw new Error('lost response');
        }
        return { nextValue: 100, kind: 'DEPOSIT', atomic: true };
      }
    },
    () => 'same-request-id'
  );
  const command = {
    kind: 'DEPOSIT',
    asset: { owner: 'jakub', type: 'KONTO_BANKOWE', subcategory: null, date: '2026-10-10' },
    amountPln: 100
  };
  await assert.rejects(gateway.recordPortfolioChange({ command }));
  await gateway.recordPortfolioChange({ command });
  assert.equal(requests.length, 2);
  assert.ok(requests.every((r) => r.path === '/portfolio-changes'));
  assert.equal(requests[0].options.body.requestId, requests[1].options.body.requestId);
  assert.ok(requests.every((r) => r.options.method === 'POST'));
});
test('historical form mapping uses the most recent balance as of the entered date', () => {
  const form = { action: 'ADD', operationType: 'DEPOSIT', type: 'KONTO_BANKOWE', date: '2026-09-15', amountPln: '50' };
  const mapped = mapPortfolioChangeForm(form, 'jakub', [
    { type: 'KONTO_BANKOWE', subcategory: null, valuePln: 1100, date: '2026-10-10', createdAt: '2026-10-10T00:00:00Z' },
    { type: 'KONTO_BANKOWE', subcategory: null, valuePln: 1000, date: '2026-09-01', createdAt: '2026-09-01T00:00:00Z' }
  ]);
  assert.equal(mapped.previousValue, 1000);
  assert.equal(
    mapPortfolioChangeForm({ ...form, action: 'INITIAL', costKnown: false, currentValuePln: '500' }, 'jakub', []).kind,
    'VALUATION'
  );
  assert.equal(
    mapPortfolioChangeForm({ ...form, action: 'INITIAL', costKnown: true, currentValuePln: '500' }, 'jakub', []).kind,
    'INITIAL'
  );
});
test('invalid preference edits do not overwrite a previously valid plan', () => {
  const stored = new Map();
  const repository = new LocalStoragePreferenceRepository({
    getItem: (k) => stored.get(k) ?? null,
    setItem: (k, v) => stored.set(k, v)
  });
  repository.setGlobalAllocation({ BONDS: 50, STOCKS: 30, GOLD: 20 });
  const before = new Map(stored);
  assert.throws(() => repository.setGlobalAllocation({ BONDS: 80, STOCKS: 30, GOLD: 20 }));
  assert.deepEqual(stored, before);
});
