import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyInput, percentageTotal } from '../../src/domain/portfolio/decimal.js';
import { planFlatPurchases } from '../../src/domain/portfolio/services/PurchasePlanningService.js';
import { today } from '../../src/presentation/viewModels/formatters.js';
import { historyValues } from '../../src/presentation/viewModels/portfolioHistory.js';
const weights = { BONDS: 50, GOLD: 25, RYNKI_ROZWINIETE: 17.5, RYNKI_ROZWIJAJACE_SIE: 7.5 };
const entry = (type, subcategory, valuePln) => ({
  owner: 'jakub',
  type,
  subcategory,
  valuePln,
  date: '2020-01-01',
  createdAt: '2020-01-01T00:00:00Z'
});

test('E12 decimal sum retains effective legacy precision and rejects an almost-100 sum', () => {
  assert.equal(
    percentageTotal(['33.333333333', '22.22222222211111111111', '22.22222222211111111111', '22.22222222277777777778']),
    '100'
  );
  assert.doesNotThrow(() =>
    planFlatPurchases(
      [],
      {
        BONDS: '33.333333333',
        GOLD: '22.22222222211111111111',
        RYNKI_ROZWINIETE: '22.22222222211111111111',
        RYNKI_ROZWIJAJACE_SIE: '22.22222222277777777778'
      },
      1000
    )
  );
  assert.notEqual(percentageTotal(['50', '25', '17.5', '7.49999999999999']), '100');
  for (const values of [['', '100'], ['-1', '101'], ['Infinity'], ['1e2'], ['101', '0']])
    assert.equal(percentageTotal(values), null);
});
test('E15 water filling retains the all-gold 1000 PLN regression instead of splitting mechanically', () => {
  const entries = [
    entry('OBLIGACJE', 'TRZYLETNIE', 5000),
    entry('GIELDA', 'RYNKI_ROZWINIETE', 1750),
    entry('IKZE', 'RYNKI_ROZWIJAJACE_SIE', 750)
  ];
  assert.deepEqual(
    planFlatPurchases(entries, weights, 1000).rows.map((r) => r.purchaseAmount),
    [0, 1000, 0, 0]
  );
});
test('E16 money accepts Polish paste, zero and cents and rejects silent rounding', () => {
  assert.equal(moneyInput(' 1\u00a0234,56 '), 1234.56);
  assert.equal(moneyInput('0,01'), 0.01);
  assert.equal(moneyInput('0'), 0);
  for (const value of ['', '-1', '0.001', 'NaN', 'Infinity', '1e3', '9007199254740993', '90071992547409.91'])
    assert.equal(moneyInput(value), null);
});
test('E16 every purchase sum is the budget in cents, including large and zero-target allocations', () => {
  for (const budget of [0, 0.01, 0.02, 1, 1000, 1000000000000.25])
    for (const target of [weights, { BONDS: 0, GOLD: 100, RYNKI_ROZWINIETE: 0, RYNKI_ROZWIJAJACE_SIE: 0 }]) {
      const plan = planFlatPurchases([entry('OBLIGACJE', 'TRZYLETNIE', 999999)], target, budget);
      assert.equal(
        plan.rows.reduce((sum, r) => sum + Math.round(r.purchaseAmount * 100), 0),
        Math.round(budget * 100)
      );
      assert.ok(plan.rows.every((r) => r.purchaseAmount >= 0 && r.afterValue >= r.currentValue));
      assert.ok(Math.abs(plan.rows.reduce((sum, r) => sum + r.afterWeight, 0) - 100) < 1e-8);
    }
  assert.throws(() => planFlatPurchases([], weights, 0.001));
});
test('E17 cash and all other products never change the calculation, denominator or after weights', () => {
  const entries = [entry('IKE', 'ZLOTO', 100)];
  const additional = [entry('KONTO_BANKOWE', null, 1000000), entry('PPK', null, 9000000), entry('PPO', null, 8000000)];
  const before = planFlatPurchases(entries, weights, 500),
    after = planFlatPurchases([...entries, ...additional], weights, 500);
  assert.deepEqual(after.rows, before.rows);
  assert.equal(after.total, 100);
  assert.ok(Math.abs(after.rows.reduce((sum, r) => sum + r.afterWeight, 0) - 100) < 1e-10);
});
test('E18 empty holdings plan purchases without recording any event', () => {
  const entries = [];
  assert.deepEqual(
    planFlatPurchases(entries, weights, 1000).rows.map((r) => r.purchaseAmount),
    [500, 250, 175, 75]
  );
  assert.deepEqual(entries, []);
});
test('E23 Warsaw business dates cover midnight, summer time and daylight saving transitions', () => {
  for (const [instant, date] of [
    ['2026-11-15T23:30:00Z', '2026-11-16'],
    ['2026-06-01T22:30:00Z', '2026-06-02'],
    ['2026-03-29T00:30:00Z', '2026-03-29'],
    ['2026-03-29T01:30:00Z', '2026-03-29'],
    ['2026-10-25T00:30:00Z', '2026-10-25'],
    ['2026-10-25T01:30:00Z', '2026-10-25']
  ])
    assert.equal(today(new Date(instant)), date);
});
test('E27 initial deletion and history use both named amounts, including a known zero basis', () => {
  assert.match(historyValues({ kind: 'INITIAL', valuePln: 100, amountPln: 0 }), /^Wartość: 100,00.*Wpłaty: 0,00/);
  assert.match(historyValues({ kind: 'VALUATION', valuePln: 0 }), /^Nowa wartość: 0,00/);
});

test('E21 source availability uses only the balance known at the action date', async () => {
  const { mapPortfolioChangeForm } = await import('../../src/presentation/mappers/portfolioChangeFormMapper.js');
  const { RecordPortfolioChange } = await import('../../src/application/portfolio/RecordPortfolioChange.js');
  const source = [
    { ...entry('KONTO_BANKOWE', null, 100), date: '2020-01-01' },
    { ...entry('KONTO_BANKOWE', null, 10000), date: '2020-03-01' }
  ];
  const form = {
    action: 'BUY',
    type: 'GIELDA',
    subcategory: 'ZLOTO',
    cashType: 'KONTO_BANKOWE',
    date: '2020-02-01',
    amountPln: '150'
  };
  const mapped = mapPortfolioChangeForm(form, 'jakub', source);
  assert.equal(mapped.cashAvailable, 100);
  let writes = 0;
  const useCase = new RecordPortfolioChange({ recordPortfolioChange: async () => writes++ });
  await assert.rejects(() => useCase.execute(mapped), /wystarczających środków/);
  assert.equal(writes, 0);
  await assert.rejects(() => useCase.execute(mapPortfolioChangeForm(form, 'jakub', [])), /Dodaj stan konta/);
  assert.equal(writes, 0);
});
