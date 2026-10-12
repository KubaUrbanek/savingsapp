import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequestId, requestSignature } from '../../src/infrastructure/http/BrowserRequestIdentity.js';
import { createApplicationDependencies } from '../../src/app/compositionRoot.js';

const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values
  };
};
const httpCrypto = { getRandomValues: (bytes) => crypto.getRandomValues(bytes) };
const command = () => ({
  kind: 'DEPOSIT',
  asset: { owner: 'jakub', type: 'KONTO_BANKOWE', subcategory: null, date: '2020-01-01' },
  amountPln: 25
});

test('UUID v4 uses only getRandomValues and has the correct variant/version bits', () => {
  assert.equal(
    createRequestId({ getRandomValues: (bytes) => bytes.fill(255) }),
    'ffffffff-ffff-4fff-bfff-ffffffffffff'
  );
  const ids = new Set(Array.from({ length: 100 }, () => createRequestId(httpCrypto)));
  assert.equal(ids.size, 100);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('SHA-256 signatures match existing Web Crypto keys, including UTF-8 payloads', () => {
  for (const payload of ['', 'abc', 'Złoto — wpłata 125,50 zł', JSON.stringify(command())]) {
    assert.equal(requestSignature(payload), createHash('sha256').update(payload).digest('hex'));
  }
});
test('real composition saves on HTTP and retains uncertain IDs across reload and retry', async () => {
  const sessionStorage = storage();
  const requests = [];
  let fail = true;
  const browser = {
    crypto: httpCrypto,
    sessionStorage,
    localStorage: storage(),
    fetch: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      if (fail) {
        fail = false;
        throw new TypeError('Lost response');
      }
      return new Response(JSON.stringify({ nextValue: 25, kind: 'DEPOSIT', atomic: true }));
    }
  };
  await assert.rejects(createApplicationDependencies(browser).useCases.recordPortfolioChange.execute(command()));
  assert.equal(sessionStorage.values.size, 1);
  assert.match([...sessionStorage.values.keys()][0], /^oszczednosci\.pending\.[0-9a-f]{64}$/);
  await createApplicationDependencies(browser).useCases.recordPortfolioChange.execute(command());
  assert.equal(requests[0].requestId, requests[1].requestId);
  assert.equal(sessionStorage.values.size, 0);
  await createApplicationDependencies(browser).useCases.recordPortfolioChange.execute(command());
  assert.notEqual(requests[1].requestId, requests[2].requestId);
});
