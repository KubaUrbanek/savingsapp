import assert from 'node:assert/strict';
import test from 'node:test';
import { LoadPortfolio } from '../../src/application/LoadPortfolio.js';
import { LoadPortfolioPerformance } from '../../src/application/LoadPortfolioPerformance.js';
import { HouseholdPortfolio, OwnerPortfolio, PortfolioScopeKind } from '../../src/application/PortfolioScope.js';

test('portfolio scopes represent owners and households without a sentinel owner', () => {
  assert.deepEqual(OwnerPortfolio('JAKUB'), { kind: PortfolioScopeKind.OWNER, ownerId: 'JAKUB' });
  assert.deepEqual(HouseholdPortfolio(['JAKUB', 'ZOSIA', 'JAKUB']), {
    kind: PortfolioScopeKind.HOUSEHOLD,
    ownerIds: ['JAKUB', 'ZOSIA']
  });
  assert.throws(() => HouseholdPortfolio([]), /non-empty/);
});

test('portfolio loader resolves every owner in a household with the same filters', async () => {
  const calls = [];
  const entries = {
    findAll(filters) {
      calls.push(filters);
      return Promise.resolve([{ owner: filters.owner }]);
    }
  };

  const result = await new LoadPortfolio(entries).execute({
    scope: HouseholdPortfolio(['JAKUB', 'ZOSIA']),
    filters: { type: 'GIELDA' }
  });

  assert.deepEqual(calls, [
    { owner: 'JAKUB', type: 'GIELDA' },
    { owner: 'ZOSIA', type: 'GIELDA' }
  ]);
  assert.deepEqual(result, [{ owner: 'JAKUB' }, { owner: 'ZOSIA' }]);
});

test('operations and performance are loaded only for an explicit owner scope', async () => {
  const calls = [];
  const useCase = new LoadPortfolioPerformance(
    {
      findAll: (filters) => {
        calls.push(['operations', filters]);
        return Promise.resolve([]);
      }
    },
    {
      loadPerformance: (filters) => {
        calls.push(['performance', filters]);
        return Promise.resolve({});
      }
    }
  );

  await useCase.execute({ scope: OwnerPortfolio('JAKUB'), filters: { type: 'IKE' } });
  assert.deepEqual(calls, [
    ['operations', { owner: 'JAKUB', type: 'IKE' }],
    ['performance', { owner: 'JAKUB', type: 'IKE' }]
  ]);
  assert.throws(
    () => useCase.execute({ scope: HouseholdPortfolio(['JAKUB', 'ZOSIA']) }),
    /require an owner portfolio scope/
  );
});
