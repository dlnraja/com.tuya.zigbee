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
  it('background never blocks or rejects', async () => {
    let done = false; const start = Date.now();
    background(async () => { await new Promise((r) => setTimeout(r, 30)); throw new Error('boom'); });
    done = true; assert.ok(done && Date.now() - start < 20);
    await new Promise((r) => setTimeout(r, 50));
  });
});
