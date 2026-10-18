import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const submit = require('../api/submit.js');
const status = require('../api/status.js');
const originalFetch = globalThis.fetch;
const originalUrl = process.env.GOOGLE_SHEETS_WEB_APP_URL;
const originalSecret = process.env.GOOGLE_SHEETS_SECRET;

async function call(handler, request) {
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await handler(request, response);
  return response;
}

const request = (body, origin = 'https://croptera.example') => ({
  method: 'POST',
  headers: { host: 'croptera.example', origin, 'content-type': 'application/json' },
  body
});

try {
  delete process.env.GOOGLE_SHEETS_WEB_APP_URL;
  delete process.env.GOOGLE_SHEETS_SECRET;
  assert.equal((await call(status, { method: 'GET' })).body.ready, false);
  const valid = { type: 'farmers', name: 'Test Farmer', email: 'farmer@example.com', consent: true, state: 'UP' };
  assert.equal((await call(submit, request(valid))).statusCode, 503);
  process.env.GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.GOOGLE_SHEETS_SECRET = 'test-secret';
  assert.equal((await call(status, { method: 'GET' })).body.ready, true);
  assert.equal((await call(submit, request(valid, 'https://other.example'))).statusCode, 403);
  assert.equal((await call(submit, request({ ...valid, consent: false }))).statusCode, 400);
  assert.equal((await call(submit, request({ ...valid, website: 'spam' }))).statusCode, 400);
  let forwarded;
  globalThis.fetch = async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return { ok: true, json: async () => ({ saved: true, id: forwarded.record.id }) };
  };
  const saved = await call(submit, request(valid));
  assert.equal(saved.statusCode, 201);
  assert.equal(saved.body.saved, true);
  assert.equal(forwarded.secret, 'test-secret');
  assert.equal(forwarded.record.type, 'farmers');
  assert.equal(forwarded.record.email, 'farmer@example.com');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ saved: false }) });
  assert.equal((await call(submit, request(valid))).statusCode, 503);
  console.log('Public form endpoint and storage confirmation verified.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.GOOGLE_SHEETS_WEB_APP_URL;
  else process.env.GOOGLE_SHEETS_WEB_APP_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.GOOGLE_SHEETS_SECRET;
  else process.env.GOOGLE_SHEETS_SECRET = originalSecret;
}
