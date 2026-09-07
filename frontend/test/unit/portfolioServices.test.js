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

test('stock allocation sums the latest ETF valuations across account types and household owners', () => {
  const entries = [
    entry('JAN', 'GIELDA', 100, '2026-01-01', 'ZLOTO'),
    entry('JAN', 'GIELDA', 150, '2026-02-01', 'ZLOTO'),
    entry('JAN', 'IKE', 200, '2026-03-01', 'ZLOTO'),
    entry('ALA', 'IKZE', 250, '2026-04-01', 'ZLOTO'),
    entry('ALA', 'IKE', 400, '2026-02-15', 'RYNKI_ROZWINIETE'),
    entry('ALA', 'OBLIGACJE', 999, '2026-05-01', 'TRZYLETNIE')
  ];

  const allocation = AllocationPlanningService.stocks(entries, {
    ZLOTO: 60,
    RYNKI_ROZWINIETE: 40,
    RYNKI_ROZWIJAJACE_SIE: 0
  });
  const gold = allocation.rows.find((row) => row.subcategory === 'ZLOTO');

  assert.equal(allocation.total, 1000);
  assert.equal(gold.currentValue, 600);
  assert.equal(gold.latestDate, '2026-04-01');
});

test('time-series query combines owner repositories and returns unformatted domain points', async () => {
  const repository = { findAll: async ({ owner }) => [entry(owner, 'OBLIGACJE', 10, '2026-01-01')] };
  const result = await new LoadPortfolioTimeSeries(repository).execute({
    scope: { kind: 'HOUSEHOLD', ownerIds: ['JAN', 'ALA'] }
  });
  assert.equal(result[0].total, 20);
  assert.equal('label' in result[0], false);
});
