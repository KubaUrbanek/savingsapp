import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AllocationWeight,
  InvestmentClassificationPolicy,
  InvestmentEntry,
  Money,
  ValuationDate
} from '../../src/domain/portfolio/index.js';

test('value types reject invalid money, percentages, and calendar dates', () => {
  assert.equal(Money.positive('12.34'), 12.34);
  assert.throws(() => Money.positive(''), /required/);
  assert.throws(() => Money.positive(0), /positive/);
  assert.throws(() => Money.positive('12.345'), /two decimal/);
  assert.equal(AllocationWeight.parse(100), 100);
  assert.throws(() => AllocationWeight.parse(100.01), /between/);
  assert.equal(ValuationDate.parse('2024-02-29'), '2024-02-29');
  assert.throws(() => ValuationDate.parse('2023-02-29'), /real calendar/);
});

test('classification policy owns compatible subcategories and global classes', () => {
  assert.deepEqual(InvestmentClassificationPolicy.subcategoriesFor('KONTO_BANKOWE'), []);
  assert.throws(() => InvestmentClassificationPolicy.classify('GIELDA', null), /compatible/);
  assert.throws(() => InvestmentClassificationPolicy.classify('KONTO_BANKOWE', 'ZLOTO'), /does not support/);
  assert.equal(InvestmentClassificationPolicy.globalAssetClass({ type: 'IKE', subcategory: 'ZLOTO' }), 'GOLD');
});

test('entry factory creates immutable valid domain state with canonical null subcategory', () => {
  const entry = InvestmentEntry.create({
    id: '1',
    type: 'KONTO_BANKOWE',
    owner: 'JAN',
    subcategory: undefined,
    valuePln: '10.00',
    date: '2026-09-01',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  });
  assert.equal(entry.subcategory, null);
  assert.equal(entry.valuePln, 10);
  assert.ok(Object.isFrozen(entry));
});
