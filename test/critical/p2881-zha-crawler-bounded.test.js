'use strict';
// WHY(P2881, 2026-10-19): the gmail-diagnostics light sync ran the ZHA crawler against 55 hard-coded quirk paths,
// 34 of them gone upstream; every 404 was retried with back-off one file at a time and the step hit its 150 s
// timeout on each run. The crawler now lists the real files, never retries a 4xx and stops at a deadline.
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const zha = require('../../scripts/sync/crawl-zha.js');

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

describe('P2881 ZHA crawler — bounded, no retry on missing files', () => {
  it('a 404 is fetched once, never retried', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return { ok: false, status: 404, text: async () => '' }; };
    await assert.rejects(zha.getText('https://example.invalid/x.py'), /HTTP 404/);
    assert.equal(calls, 1);
  });

  it('a transient 503 is retried', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return calls < 2 ? { ok: false, status: 503, text: async () => '' } : { ok: true, status: 200, text: async () => 'ok' }; };
    assert.equal(await zha.getText('https://example.invalid/y.py'), 'ok');
    assert.equal(calls, 2);
  });

  it('falls back to the known list when the tree listing is unavailable', async () => {
    globalThis.fetch = async () => { throw new Error('offline'); };
    const r = await zha.listQuirkFiles();
    assert.equal(r.from, 'known-list');
    assert.ok(r.files.includes('tuya/ts0601_trv.py'));
  });

  it('stops at the deadline with a partial result', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '("_TZE200_abcdefgh", "TS0601")' });
    const r = await zha.fetchAll(['a.py', 'b.py', 'c.py'], Date.now() - 1);
    assert.equal(r.partial, true);
    assert.equal(r.fetched, 0);
    const full = await zha.fetchAll(['tuya/a.py'], Date.now() + 10000);
    assert.equal(full.partial, false);
    assert.deepEqual(full.fps.map((f) => [f.mfr, f.productId]), [['_TZE200_abcdefgh', 'TS0601']]);
  });
});
