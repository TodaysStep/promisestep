import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicAPIClient, PromiseStepError } from '../js/index.mjs';
const code = c => e => e instanceof PromiseStepError && e.code === c;
const response = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
for (const url of ['http://example.test/api/', 'https://user:secret@example.test/api/', 'https://example.test/api/?x=y', 'https://example.test/api/#x', 'https://example.test/api']) test(`refuses unsafe API base: ${url.replace('secret','redacted')}`, () => assert.throws(() => new PublicAPIClient({ baseURL: url }), code('INVALID_INPUT')));
test('loopback development base is explicit and supported', () => assert.doesNotThrow(() => new PublicAPIClient({ baseURL: 'http://127.0.0.1:4040/api/v1/' })));
for (const timeoutMs of [0, -1, 60001, Infinity, NaN]) test(`refuses invalid timeout: ${timeoutMs}`, () => assert.throws(() => new PublicAPIClient({ timeoutMs }), code('INVALID_INPUT')));
test('public client uses GET, omits credentials and refuses redirects', async () => {
 let observed; const client = new PublicAPIClient({ fetch: async (url, config) => { observed = { url, config }; return response({ version: 1 }); } });
 assert.deepEqual(await client.get('health'), { version: 1 }); assert.equal(observed.config.method, 'GET'); assert.equal(observed.config.credentials, 'omit'); assert.equal(observed.config.redirect, 'error');
 assert.equal(String(observed.url), 'https://promisestep.com/api/v1/health'); assert.deepEqual(Object.keys(observed.config.headers), ['Accept']);
});
test('no arbitrary URLs, traversal, query payloads or owner records', async () => { const client = new PublicAPIClient({ fetch: async () => { throw Error('must not fetch'); } }); for (const key of ['../private', 'https://other.example', 'guidelines?token=secret', 'records']) await assert.rejects(client.get(key), code('INVALID_INPUT')); });
test('HTTP failure is not converted into an empty successful result', async () => { const client = new PublicAPIClient({ fetch: async () => new Response('denied', { status: 403 }) }); await assert.rejects(client.get('health'), code('HTTP_ERROR')); });
test('HTML fallback is refused even when its HTTP status is 200', async () => { const client = new PublicAPIClient({ fetch: async () => new Response('<html>not an API</html>', { headers: { 'content-type': 'text/html' } }) }); await assert.rejects(client.get('health'), code('INVALID_RESPONSE')); });
test('invalid JSON is refused', async () => { const client = new PublicAPIClient({ fetch: async () => new Response('{oops', { headers: { 'content-type': 'application/json' } }) }); await assert.rejects(client.get('health'), code('INVALID_RESPONSE')); });
test('oversized declared body is refused', async () => { const client = new PublicAPIClient({ fetch: async () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '2000001' } }) }); await assert.rejects(client.get('health'), code('LIMIT_EXCEEDED')); });
test('oversized chunked body is cancelled rather than fully buffered', async () => {
 let cancelled = false; const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(600000)); }, cancel() { cancelled = true; } });
 const client = new PublicAPIClient({ fetch: async () => new Response(stream, { headers: { 'content-type': 'application/json' } }) }); await assert.rejects(client.get('health'), code('LIMIT_EXCEEDED')); assert.equal(cancelled, true);
});
test('network failure remains unavailable, not denied', async () => { const client = new PublicAPIClient({ fetch: async () => { throw Error('private network detail'); } }); await assert.rejects(client.get('health'), e => e.code === 'UNAVAILABLE' && !e.message.includes('private network detail')); });
test('pre-cancelled request makes no network call', async () => { let calls = 0; const ac = new AbortController(); ac.abort(); const c = new PublicAPIClient({ fetch: async () => { calls++; return response({}); } }); await assert.rejects(c.get('health', { signal: ac.signal }), code('CANCELLED')); assert.equal(calls, 0); });
const waiting = (_url, { signal }) => new Promise((_ok, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
test('timeout ends a pending network request', async () => { const c = new PublicAPIClient({ timeoutMs: 10, fetch: waiting }); await assert.rejects(c.get('health'), code('TIMEOUT')); });
test('caller cancellation stays distinct from network failure', async () => { const ac = new AbortController(); const c = new PublicAPIClient({ timeoutMs: 1000, fetch: waiting }); const p = c.get('health', { signal: ac.signal }); ac.abort(); await assert.rejects(p, code('CANCELLED')); });
