import test from 'node:test';
import assert from 'node:assert/strict';
import { affectedQueries, PortfolioQuery } from '../../src/presentation/portfolio/hooks/refreshPolicy.js';

test('portfolio command refresh policy invalidates only related query families', () => {
  assert.deepEqual(affectedQueries('deleteInvestmentOperation'), [
    PortfolioQuery.OPERATIONS,
    PortfolioQuery.PERFORMANCE
  ]);
  assert.deepEqual(affectedQueries('deleteInvestmentEntry'), [
    PortfolioQuery.ENTRIES,
    PortfolioQuery.SNAPSHOT,
    PortfolioQuery.PERFORMANCE
  ]);
  assert.deepEqual(affectedQueries('unknownCommand'), []);
});
