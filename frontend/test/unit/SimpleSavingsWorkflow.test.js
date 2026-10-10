import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordPortfolioChange } from '../../src/application/portfolio/RecordPortfolioChange.js';
import { LoadPortfolioPerformance } from '../../src/application/LoadPortfolioPerformance.js';
import { HouseholdPortfolio } from '../../src/application/PortfolioScope.js';
import { FetchPortfolioCommandGateway } from '../../src/infrastructure/http/FetchPortfolioCommandGateway.js';
import { mapPortfolioChangeForm } from '../../src/presentation/mappers/portfolioChangeFormMapper.js';
import { portfolioHistory } from '../../src/presentation/viewModels/portfolioHistory.js';

test('household ignores owner filters and an empty owner does not hide known profit', async () => {
  const calls = [];
  const loader = new LoadPortfolioPerformance(
    {
      findAll: async (q) => {
        calls.push(q);
        return q.owner === 'jakub' ? [{ id: 'initial' }] : [];
      }
    },
    {
      loadPerformance: async (q) => {
        calls.push(q);
        return { currentValuePln: q.owner === 'jakub' ? 500 : 0, nominalResultPln: q.owner === 'jakub' ? 50 : null };
      }
    }
  );
  const result = await loader.execute({
    scope: HouseholdPortfolio(['jakub', 'zosia']),
    filters: { type: 'GIELDA', subcategory: 'ZLOTO' }
  });
  assert.equal(result.performance.currentValuePln, 500);
  assert.equal(result.performance.nominalResultPln, 50);
  assert.ok(calls.every((q) => !q.type && !q.subcategory));
});
test('a nonempty owner with unknown basis keeps household profit unknown', async () => {
  const loader = new LoadPortfolioPerformance(
    { findAll: async () => [] },
    { loadPerformance: async (q) => ({ currentValuePln: 500, nominalResultPln: q.owner === 'jakub' ? 50 : null }) }
  );
  const result = await loader.execute({ scope: HouseholdPortfolio(['jakub', 'zosia']) });
  assert.equal(result.performance.currentValuePln, 1000);
  assert.equal(result.performance.nominalResultPln, null);
});
test('correction uses PUT and the original identifier on retry, followed by a distinct POST', async () => {
  const calls = [];
  let fail = true;
  const gateway = new FetchPortfolioCommandGateway(
    {
      json: async (path, options) => {
        calls.push({ path, options });
        if (fail) {
          fail = false;
          throw new Error('lost');
        }
        return { atomic: true, nextValue: 10, kind: 'DEPOSIT' };
      }
    },
    () => 'new-id'
  );
  const command = {
    editId: 'old-id',
    kind: 'DEPOSIT',
    asset: { owner: 'jakub', type: 'KONTO_BANKOWE', date: '2026-09-01' },
    amountPln: 10
  };
  await assert.rejects(gateway.recordPortfolioChange({ command }));
  await gateway.recordPortfolioChange({ command });
  assert.ok(
    calls.every(
      (c) =>
        c.path === '/portfolio-changes/old-id' && c.options.method === 'PUT' && c.options.body.requestId === 'old-id'
    )
  );
  const { editId, ...newCommand } = command;
  void editId;
  await gateway.recordPortfolioChange({ command: newCommand });
  assert.equal(calls[2].options.method, 'POST');
  assert.equal(calls[2].options.body.requestId, 'new-id');
});
test('blank asset mapping is safe and historical amounts never leak across owners', () => {
  const form = { action: 'DEPOSIT', type: 'KONTO_BANKOWE', subcategory: '', amountPln: '10', date: '2026-09-01' };
  assert.equal(
    mapPortfolioChangeForm(form, 'jakub', [
      { owner: 'zosia', type: 'KONTO_BANKOWE', date: '2026-09-01', valuePln: 1000 }
    ]).previousValue,
    0
  );
  assert.doesNotThrow(() => mapPortfolioChangeForm({ ...form, type: '' }, 'jakub', []));
});
test('history merges linked changes once and sorts explicit valuations and legacy operations together', () => {
  const entries = [
    { id: 'buy', date: '2026-09-01', valuePln: 100 },
    { id: 'cash', date: '2026-09-01', valuePln: 400 },
    { id: 'value', date: '2026-09-03', valuePln: 110 }
  ];
  const operations = [
    { id: 'buy', groupId: 'buy', operationType: 'BUY', date: '2026-09-01' },
    { id: 'cash', groupId: 'buy', operationType: 'SELL', type: 'KONTO_BANKOWE', date: '2026-09-01' },
    { id: 'legacy', operationType: 'DEPOSIT', date: '2026-09-02' }
  ];
  const rows = portfolioHistory(entries, operations);
  assert.deepEqual(
    rows.map((r) => r.id),
    ['value', 'legacy', 'buy']
  );
  assert.equal(rows[2].cashType, 'KONTO_BANKOWE');
  assert.equal(rows[1].legacy, true);
});

test('withdrawal corrections are validated against the replaced event by the server', async () => {
  const command = {
    editId: 'withdrawal',
    kind: 'WITHDRAWAL',
    asset: { owner: 'jakub', type: 'KONTO_BANKOWE', date: '2026-09-01' },
    previousValue: 25,
    amountPln: 50
  };
  let forwarded;
  const service = new RecordPortfolioChange({
    recordPortfolioChange: async ({ command: intent }) => {
      forwarded = intent;
      return { nextValue: 100, atomic: true };
    }
  });
  assert.equal((await service.execute(command)).nextValue, 100);
  assert.equal(forwarded, command);
  await assert.rejects(service.execute({ ...command, editId: undefined }), /Kwota przekracza/);
});
