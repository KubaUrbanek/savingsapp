import assert from 'node:assert/strict';
import test from 'node:test';
import { FetchHttpClient, HttpError } from '../../src/infrastructure/http/FetchHttpClient.js';

test('Fetch adapter serializes query/body and parses a controlled JSON response', async () => {
  let request;
  const client = new FetchHttpClient(async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ saved: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }, 'https://example.test/api');
  assert.deepEqual(
    await client.json('/entries', { query: { owner: 'JAN', empty: null }, method: 'POST', body: { value: 10 } }),
    { saved: true }
  );
  assert.equal(request.url, 'https://example.test/api/entries?owner=JAN');
  assert.equal(request.options.body, '{"value":10}');
});

test('Fetch adapter maps controlled HTTP and transport failures', async () => {
  const rejected = new FetchHttpClient(async () => new Response(JSON.stringify({ message: 'Nope' }), { status: 422 }));
  await assert.rejects(
    rejected.json('/entries'),
    (error) => error instanceof HttpError && error.status === 422 && error.message === 'Nope'
  );
  const offline = new FetchHttpClient(async () => {
    throw new TypeError('offline');
  });
  await assert.rejects(offline.json('/entries'), (error) => error instanceof HttpError && error.status === undefined);
});
