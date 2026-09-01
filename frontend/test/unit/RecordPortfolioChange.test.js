import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RecordPortfolioChange,
  PortfolioChangeValidationFailure,
  deposit,
  withdrawal,
  valuation,
  buy,
  sell
} from '../../src/application/portfolio/RecordPortfolioChange.js';

const asset = { type: 'GOTOWKA', owner: 'JAN', subcategory: null, date: '2026-09-01' };

test('supports every explicit command variant and delegates one semantic command', async () => {
  const calls = [];
  const useCase = new RecordPortfolioChange({
    recordPortfolioChange: async (change) => {
      calls.push(change);
      return change;
    }
  });

  const commands = [
    deposit(asset, 10, 100),
    withdrawal(asset, 10, 100),
    valuation(asset, 125),
    buy(asset, 10, 100),
    sell(asset, 10, 100)
  ];
  for (const command of commands) await useCase.execute(command);

  assert.deepEqual(
    calls.map(({ nextValue }) => nextValue),
    [110, 90, 125, 110, 90]
  );
  assert.deepEqual(
    calls.map(({ command }) => command.kind),
    ['DEPOSIT', 'WITHDRAWAL', 'VALUATION', 'BUY', 'SELL']
  );
});

test('returns a field-addressable failure instead of clamping an overdrawn withdrawal', async () => {
  const useCase = new RecordPortfolioChange({
    recordPortfolioChange: () => assert.fail('invalid command must not reach the gateway')
  });

  await assert.rejects(
    useCase.execute(withdrawal(asset, 101, 100)),
    (error) =>
      error instanceof PortfolioChangeValidationFailure &&
      error.field === 'amountPln' &&
      error.code === 'INSUFFICIENT_PORTFOLIO_VALUE'
  );
});
