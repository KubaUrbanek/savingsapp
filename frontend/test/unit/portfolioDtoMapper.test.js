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
  const entry = mapInvestmentDto({ ...common, valuePln: '100.25', updatedAt: common.createdAt });
  const operation = mapOperationDto({
    ...common,
    operationType: 'BUY',
    amountPln: '50.00',
    feePln: '1.00',
    taxPln: 0,
    note: null
  });
  assert.equal(entry.valuePln, 100.25);
  assert.equal(operation.amountPln, 50);
  assert.ok(Object.isFrozen(entry));
  assert.ok(Object.isFrozen(operation));
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
