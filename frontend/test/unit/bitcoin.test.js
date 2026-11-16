import test from 'node:test';
import assert from 'node:assert/strict';
import { InvestmentClassificationPolicy as policy } from '../../src/domain/portfolio/classification.js';
import { planPurchases } from '../../src/domain/portfolio/services/PurchasePlanningService.js';
import { FetchPortfolioPlanGateway } from '../../src/infrastructure/http/FetchPortfolioPlanGateway.js';
const equity = { GOLD: 40, RYNKI_ROZWINIETE: 35, RYNKI_ROZWIJAJACE_SIE: 15, BITCOIN: 10 };
test('Bitcoin belongs to market accounts and has its own global class', () => {
  for (const type of ['GIELDA', 'IKE', 'IKZE'])
    assert.equal(policy.globalAssetClass({ type, subcategory: 'BITCOIN' }), 'BITCOIN');
  for (const type of ['OBLIGACJE', 'KONTO_BANKOWE', 'PPK', 'PPO'])
    assert.throws(() => policy.classify(type, 'BITCOIN'));
});
test('AC-07 budget includes Bitcoin and conserves cents', () => {
  const result = planPurchases([], { BONDS: 50, STOCKS: 50 }, equity, 1000);
  assert.deepEqual(
    result.rows.map((r) => r.purchaseAmount),
    [500, 200, 175, 75, 50]
  );
});
test('AC-08 held Bitcoin with zero target counts in total without purchases', () => {
  const result = planPurchases(
    [{ owner: 'jakub', type: 'GIELDA', subcategory: 'BITCOIN', valuePln: 500, date: '2026-11-01' }],
    { BONDS: 50, STOCKS: 50 },
    { ...equity, GOLD: 50, BITCOIN: 0 },
    100
  );
  assert.equal(result.total, 500);
  const bitcoin = result.rows.find((r) => r.key === 'BITCOIN');
  assert.equal(bitcoin.currentWeight, 100);
  assert.equal(bitcoin.purchaseAmount, 0);
});
test('version 3 plan round trips and rejects old clients and missing Bitcoin', async () => {
  const plan = { bonds: 50, gold: 20, developed: 17.5, emerging: 7.5, bitcoin: 5 };
  const gateway = new FetchPortfolioPlanGateway({ json: async (_url, options) => options.body });
  assert.deepEqual(await gateway.save('jakub', plan), plan);
  assert.throws(() => gateway.validate({ ...plan, allocationVersion: 2 }));
  assert.throws(() => gateway.validate({ ...plan, bitcoin: undefined, allocationVersion: 4 }));
});

test('older preferences gain zero Bitcoin targets without losing weights', async () => {
  const { LocalStoragePreferenceRepository, PREFERENCE_STORAGE_KEY } =
    await import('../../src/infrastructure/storage/LocalStoragePreferenceRepository.js');
  const storage = new Map([
    [
      PREFERENCE_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        preferences: {
          selectedOwner: 'jakub',
          householdGoal: 500000,
          stockAllocation: { ZLOTO: 40, RYNKI_ROZWINIETE: 30, RYNKI_ROZWIJAJACE_SIE: 30 },
          globalAllocation: { BONDS: 50, STOCKS: 30, GOLD: 20 }
        }
      })
    ]
  ]);
  const repository = new LocalStoragePreferenceRepository({
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value)
  });
  assert.deepEqual(repository.getGlobalAllocation(), { BONDS: 50, STOCKS: 30, GOLD: 20, BITCOIN: 0 });
  assert.equal(repository.getStockAllocation().BITCOIN, 0);
  assert.equal(JSON.parse(storage.get(PREFERENCE_STORAGE_KEY)).version, 3);
});

test('Bitcoin is available in overview asset-class filters and distributions', async () => {
  const { availableGroups, buildOverviewDistribution } =
    await import('../../src/domain/portfolio/overviewVisualization.js');
  const entries = [
    {
      owner: 'jakub',
      type: 'GIELDA',
      subcategory: 'BITCOIN',
      valuePln: 500,
      date: '2020-01-01',
      createdAt: '2020-01-01T10:00:00Z'
    }
  ];
  assert.deepEqual(availableGroups(entries, 'assetClasses'), ['BITCOIN']);
  assert.deepEqual(buildOverviewDistribution(entries, 'assetClasses'), [{ key: 'BITCOIN', value: 500, share: 100 }]);
});
