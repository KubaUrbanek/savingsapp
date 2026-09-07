import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MappingError,
  mapInvestmentDto,
  mapInvestmentTypesDto,
  mapOperationDto
} from '../../src/infrastructure/http/mappers/index.js';

const common = {
  id: '1',
  type: 'GIELDA',
  owner: 'JAN',
  subcategory: 'ZLOTO',
  date: '2026-09-01',
  createdAt: '2026-09-01T10:00:00Z'
};

test('HTTP mappers translate entry and operation payloads into domain objects', () => {
  const entry = mapInvestmentDto({ ...common, valuePln: '100.25', updatedAt: null });
  const operation = mapOperationDto({
    ...common,
    operationType: 'BUY',
    amountPln: '50.00',
    feePln: '1.00',
    taxPln: 0,
    note: null
  });
  assert.equal(entry.valuePln, 100.25);
  assert.equal(entry.updatedAt, null);
  assert.equal(operation.amountPln, 50);
  assert.ok(Object.isFrozen(entry));
  assert.ok(Object.isFrozen(operation));
});

test('investment mapper preserves a valid textual updatedAt for an updated entry', () => {
  const entry = mapInvestmentDto({
    ...common,
    valuePln: '100.25',
    updatedAt: '2026-09-02T11:30:00Z'
  });

  assert.equal(entry.updatedAt, '2026-09-02T11:30:00Z');
});

test('unknown enum strings and malformed optional values are explicit mapping errors', () => {
  assert.throws(() => mapInvestmentTypesDto({ values: ['GIELDA', 'CRYPTO'] }), MappingError);
  assert.throws(
    () => mapInvestmentDto({ ...common, type: 'CRYPTO', valuePln: 10, updatedAt: common.createdAt }),
    MappingError
  );
  assert.throws(
    () => mapInvestmentDto({ ...common, subcategory: '', valuePln: 10, updatedAt: common.createdAt }),
    MappingError
  );
  assert.throws(
    () => mapOperationDto({ ...common, operationType: 'VALUATION', amountPln: 10, feePln: 0, taxPln: 0 }),
    MappingError
  );
});
