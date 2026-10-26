'use strict';
// WHY(P3062): rescued from the b1019 worktree (P2870, 19/10) — the forum sweep retries a dropped
// socket instead of skipping a topic for the day, the Johan index also reads PR review comments,
// and the peer-compose tool treats a couple-only ban (forbidMode "couple") as pid-scoped.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');
const { EventEmitter } = require('events');

const ROOT = path.join(__dirname, '..', '..');

function fakeRequest(plan) {
  let call = 0;
  return (opts, onRes) => {
    const step = plan[Math.min(call++, plan.length - 1)];
    const req = new EventEmitter();
    req.setTimeout = () => req;
    req.destroy = () => {};
    req.end = () => setImmediate(() => {
      if (step === 'net') { req.emit('error', new Error('ECONNRESET')); req.emit('close'); return; }
      const res = new EventEmitter();
      res.statusCode = step.status || 200;
      res.complete = false;
      onRes(res);
      res.emit('data', Buffer.from(step.body || '{}'));
      res.complete = true;
      res.emit('end');
      res.emit('close');
      req.emit('close');
    });
    req.calls = () => call;
    return req;
  };
}

describe('P3062 forum sweep retries a dropped socket', () => {
  it('a transient network error is retried and the second answer is used', async () => {
    const orig = https.request;
    let calls = 0;
    const fr = fakeRequest(['net', { status: 200, body: '{"post_stream":{"posts":[]}}' }]);
    https.request = (o, cb) => { calls++; return fr(o, cb); };
    try {
      delete require.cache[require.resolve(path.join(ROOT, 'scripts/progress/lib/sweep-forum.js'))];
      const { getJson } = require(path.join(ROOT, 'scripts/progress/lib/sweep-forum.js'));
      const r = await getJson('/t/1/posts.json', { retries: 2, backoffMs: 1 });
      assert.equal(calls, 2);
      assert.ok(r && r.post_stream, JSON.stringify(r));
    } finally { https.request = orig; }
  });
  it('a rate limit is not retried', async () => {
    const orig = https.request;
    let calls = 0;
    const fr = fakeRequest([{ status: 429, body: '' }]);
    https.request = (o, cb) => { calls++; return fr(o, cb); };
    try {
      const { getJson } = require(path.join(ROOT, 'scripts/progress/lib/sweep-forum.js'));
      const r = await getJson('/t/1/posts.json', { retries: 2, backoffMs: 1 });
      assert.equal(calls, 1);
      assert.equal(r.rateLimited, true);
    } finally { https.request = orig; }
  });
});

describe('P3062 Johan index reads PR review comments', () => {
  it('pulls/comments stream is fetched softly', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/scanners/johan-canonical-index.js'), 'utf8');
    assert.match(src, /pulls\/comments\?since=/);
    assert.match(src, /review comments soft-skip/);
  });
});

describe('P3062 peer compose: a couple-only ban is pid-scoped', () => {
  const src = fs.readFileSync(path.join(ROOT, 'tools/ci/p2830-peer-apps-compose-complementary.js'), 'utf8');
  const pick = (name) => {
    const i = src.indexOf(`function ${name}(`);
    assert.ok(i >= 0, name);
    let depth = 0; let j = src.indexOf('{', i);
    for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break; }
    return src.slice(i, j + 1);
  };
  const ctx = {};
  vm.runInNewContext(`${pick('mfrForbiddenOnDriver')}; this.f = mfrForbiddenOnDriver;`, ctx);
  const idx = new Map([
    ['_tz3000_dfgbtub0', new Map([['button_wireless_2', new Set(['TS0044'])]])],
    ['_tz3000_wide', new Map([['button_wireless_2', null]])],
  ]);
  it('couple ban blocks only when the target driver carries the banned pid', () => {
    assert.equal(ctx.f(idx, '_TZ3000_dfgbtub0', 'button_wireless_2', ['TS0042']), false);
    assert.equal(ctx.f(idx, '_TZ3000_dfgbtub0', 'button_wireless_2', ['TS0042', 'TS0044']), true);
  });
  it('mfr-wide ban and unknown pids stay strict', () => {
    assert.equal(ctx.f(idx, '_TZ3000_wide', 'button_wireless_2', ['TS0042']), true);
    assert.equal(ctx.f(idx, '_TZ3000_dfgbtub0', 'button_wireless_2'), true);
    assert.equal(ctx.f(idx, '_TZ3000_other', 'button_wireless_2', ['TS0042']), false);
  });
});
