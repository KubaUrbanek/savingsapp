import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPortfolioChangeForm } from '../../src/presentation/mappers/portfolioChangeFormMapper.js';

const operationCases = [
  ['ADD', 'DEPOSIT'],
  ['ADD', 'BUY'],
  ['SUBTRACT', 'WITHDRAWAL'],
  ['SUBTRACT', 'SELL']
];

for (const [action, operationType] of operationCases) {
  test(`maps the ${action} UI action and ${operationType} reason to the existing domain command`, () => {
    const command = mapPortfolioChangeForm(
      {
        action,
        operationType,
        type: 'GIELDA',
        subcategory: 'ETF',
        amountPln: '25.50',
        date: '2026-09-01'
      },
      'JAN',
      [
        {
          owner: 'JAN',
          type: 'GIELDA',
          subcategory: 'ETF',
          valuePln: 100,
          date: '2026-08-01',
          createdAt: '2026-08-01T00:00:00Z'
        }
      ]
    );

    assert.deepEqual(command, {
      kind: operationType,
      asset: { type: 'GIELDA', owner: 'JAN', subcategory: 'ETF', date: '2026-09-01' },
      amountPln: '25.50',
      previousValue: 100,
      cashType: undefined
    });
  });
}

test('maps the valuation UI action directly to VALUATION regardless of a stale reason', () => {
  const command = mapPortfolioChangeForm(
    {
      action: 'VALUATION',
      operationType: 'BUY',
      type: 'GIELDA',
      subcategory: 'ETF',
      currentValuePln: '125',
      date: '2026-09-01'
    },
    'JAN',
    []
  );

  assert.deepEqual(command, {
    kind: 'VALUATION',
    asset: { type: 'GIELDA', owner: 'JAN', subcategory: 'ETF', date: '2026-09-01' },
    valuePln: '125'
  });
});
