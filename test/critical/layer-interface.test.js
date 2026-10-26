'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const { CircuitBreaker, wrapLayer, runLayers, background } = require('../../lib/layers/LayerInterface');

describe('Spec 004: non-native layer contract', () => {
  it('failing layer self-disables and never throws', async () => {
    let t = 0; const br = new CircuitBreaker({ maxFailures: 2, cooldownMs: 1000, now: () => t });
    const l = wrapLayer('e001', { read: async () => { throw new Error('UNSUP'); } }, { breaker: br });
    assert.strictEqual((await l.read()).ok, false);
    assert.strictEqual((await l.read()).ok, false);
    assert.strictEqual((await l.read()).skipped, 'disabled');
    t = 2000; assert.strictEqual(br.open, false);
  });
  it('fallback order: first ok layer wins', async () => {
    const a = wrapLayer('a', { command: async () => { throw new Error('x'); } });
    const b = wrapLayer('b', { command: async () => 42 });
    const r = await runLayers([a, b], 'command');
    assert.deepStrictEqual([r.ok, r.value, r.layer], [true, 42, 'b']);
  });
  it('timeouts are bounded', async () => {
    const l = wrapLayer('slow', { read: () => new Promise(() => {}) }, { timeoutMs: 20 });
    const r = await l.read(); assert.ok(!r.ok && /timeout/.test(r.error));
  });
  // P3075: timer-free so a loaded runner or a sibling test cannot stall it (was a 10 s
  // timeout in the full Node 22 suite on 627cbf83f0 while the contract itself held).
  it('background never blocks or rejects', async () => {
    let release; const gate = new Promise((r) => { release = r; });
    let ran = false; let logged = null; let onLog; const seen = new Promise((r) => { onLog = r; });
    const ret = background(async () => { await gate; ran = true; throw new Error('boom'); }, (m) => { logged = m; onLog(); });
    assert.strictEqual(ret, undefined); // returns at once, nothing to await
    assert.strictEqual(ran, false); // caller was not blocked on the task
    release(); await seen;
    assert.ok(ran && /background task failed: boom/.test(logged)); // failure logged, never rejected
  });
});
