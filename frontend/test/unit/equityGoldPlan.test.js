import test from 'node:test';
import assert from 'node:assert/strict';
import { planPurchases } from '../../src/domain/portfolio/services/PurchasePlanningService.js';
import { FetchPortfolioPlanGateway } from '../../src/infrastructure/http/FetchPortfolioPlanGateway.js';
const plan = { bonds: 50, stocks: 50, gold: 50, developed: 35, emerging: 15 };

test('gold gets half of the stock/ETF bucket, with no budget double counting', () => {
  const result = planPurchases(
    [],
    { BONDS: 50, STOCKS: 50 },
    { GOLD: 50, RYNKI_ROZWINIETE: 35, RYNKI_ROZWIJAJACE_SIE: 15 },
    1000
  );
  assert.deepEqual(
    result.rows.map((r) => r.purchaseAmount),
    [500, 250, 175, 75]
  );
  assert.equal(
    result.rows.reduce((sum, r) => sum + r.purchaseAmount, 0),
    1000
  );
  assert.throws(() =>
    planPurchases([], { BONDS: 50, STOCKS: 50 }, { GOLD: 50, RYNKI_ROZWINIETE: 70, RYNKI_ROZWIJAJACE_SIE: 30 }, 1000)
  );
  const bondsOnly = planPurchases(
    [],
    { BONDS: 100, STOCKS: 0 },
    { GOLD: 50, RYNKI_ROZWINIETE: 35, RYNKI_ROZWIJAJACE_SIE: 15 },
    100
  );
  assert.deepEqual(
    bondsOnly.rows.map((r) => r.purchaseAmount),
    [100, 0, 0, 0]
  );
});
test('plan adapter round trips versioned allocations and rejects old or invalid responses', async () => {
  let saved;
  const gateway = new FetchPortfolioPlanGateway({
    json: async (_url, options) => {
      if (options.method === 'PUT') saved = options.body;
      return saved || { ...plan, allocationVersion: 2 };
    }
  });
  assert.deepEqual(await gateway.load('jakub'), plan);
  assert.deepEqual(await gateway.save('jakub', plan), plan);
  assert.deepEqual(saved, { ...plan, allocationVersion: 2 });
  for (const value of [
    plan,
    { ...plan, allocationVersion: 1 },
    { ...plan, allocationVersion: 2, gold: 100 },
    { ...plan, allocationVersion: 2, stocks: 40 },
    { ...plan, allocationVersion: 2, gold: NaN }
  ]) {
    assert.throws(() => gateway.validate(value));
  }
});
