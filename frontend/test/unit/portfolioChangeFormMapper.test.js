import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPortfolioChangeForm } from '../../src/presentation/mappers/portfolioChangeFormMapper.js';

test('maps presentation form state and current valuation to a command', () => {
  const command = mapPortfolioChangeForm(
    {
      operationType: 'SELL',
      type: 'GIELDA',
      subcategory: 'ETF',
      amountPln: '25.50',
      date: '2026-09-01'
    },
    'JAN',
    [{ type: 'GIELDA', subcategory: 'ETF', valuePln: 100 }]
  );

  assert.deepEqual(command, {
    kind: 'SELL',
    asset: { type: 'GIELDA', owner: 'JAN', subcategory: 'ETF', date: '2026-09-01' },
    amountPln: '25.50',
    previousValue: 100
  });
});
