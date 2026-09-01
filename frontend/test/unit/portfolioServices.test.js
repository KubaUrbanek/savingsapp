import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AllocationPlanningService,
  HouseholdAggregationService,
  RebalancingService,
  TimeSeriesService
} from '../../src/domain/portfolio/services/index.js';
import { LoadPortfolioTimeSeries } from '../../src/application/queries/PortfolioPlanningQueries.js';

const entry = (owner, type, valuePln, date, subcategory = null) => ({
  owner,
  type,
  subcategory,
  valuePln,
  date,
  createdAt: `${date}T10:00:00Z`
});

test('pure services create allocation, rebalance, household and time-series domain results', () => {
  const entries = [
    entry('JAN', 'OBLIGACJE', 80, '2026-01-01', 'TRZYLETNIE'),
    entry('JAN', 'GIELDA', 20, '2026-01-01', 'RYNKI_ROZWINIETE')
  ];
  const plan = AllocationPlanningService.global(entries, { BONDS: 50, STOCKS: 50, GOLD: 0 });
  assert.equal(RebalancingService.global(plan).rows.find((row) => row.assetClass === 'STOCKS').contributionAmount, 60);
  assert.equal(HouseholdAggregationService.aggregate(entries, ['JAN'], ['OBLIGACJE', 'GIELDA'], 200).goalProgress, 50);
  assert.deepEqual(
    TimeSeriesService.generate(entries, 'monthly').map(({ key, total }) => ({ key, total })),
    [{ key: '2026-01', total: 100 }]
  );
});

test('time-series query combines owner repositories and returns unformatted domain points', async () => {
  const repository = { findAll: async ({ owner }) => [entry(owner, 'OBLIGACJE', 10, '2026-01-01')] };
  const result = await new LoadPortfolioTimeSeries(repository).execute({
    scope: { kind: 'HOUSEHOLD', ownerIds: ['JAN', 'ALA'] }
  });
  assert.equal(result[0].total, 20);
  assert.equal('label' in result[0], false);
});
