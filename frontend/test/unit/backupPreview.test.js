import test from 'node:test';
import assert from 'node:assert/strict';
import { FetchDatabaseBackupGateway } from '../../src/infrastructure/http/FetchDatabaseBackupGateway.js';
test('E29 validates all legacy plans before discarding unselected ones', async () => {
  const file = new File(
    [
      JSON.stringify({
        formatVersion: 2,
        entries: [],
        operations: [],
        plans: {
          jakub: { allocationVersion: 999 },
          zosia: { allocationVersion: 2, bonds: 50, stocks: 50, gold: 50, developed: 35, emerging: 15 }
        }
      })
    ],
    'old.json',
    { type: 'application/json' }
  );
  const gateway = new FetchDatabaseBackupGateway({
    multipart: async (_path, body) => {
      const backup = JSON.parse(await body.get('file').text());
      if (Object.values(backup.plans).some((plan) => plan.allocationVersion === 999)) throw { status: 400 };
      return { entries: 0, operations: 0, owners: [], sharedPlan: true };
    }
  });
  await assert.rejects(() => gateway.inspect(file, 'zosia'), /nieprawidłowe lub nieobsługiwane/);
});

test('E29 choosing a legacy plan preserves monetary decimals beyond JavaScript precision', async () => {
  const raw =
    '{"formatVersion":2,"entries":[{"valuePln":12345678901234567890.12}],"operations":[],"plans":{"zosia":{"allocationVersion":2,"bonds":50,"stocks":50,"gold":50,"developed":35,"emerging":15}}}';
  const file = new File([raw], 'precise.json', { type: 'application/json' });
  const gateway = new FetchDatabaseBackupGateway({
    multipart: async () => ({
      entries: 1,
      operations: 0,
      owners: ['zosia'],
      sharedPlan: true,
      preparedDocument: btoa(raw)
    })
  });
  const preview = await gateway.inspect(file, 'zosia');
  assert.match(await preview.file.text(), /12345678901234567890\.12/);
});
