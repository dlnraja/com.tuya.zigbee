'use strict';
const assert = require('assert');
const DpCoalescer = require('../lib/tuya/DpCoalescer');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('DpCoalescer', () => {
  it('coalesces writes into one frame, newest value wins', async () => {
    const frames = [];
    const c = new DpCoalescer({ send: async (f) => frames.push(f), debounceMs: 20, verifyMs: 0 });
    c.set(1, true); c.set(3, 100); const p = c.set(3, 500);
    await p;
    assert.strictEqual(frames.length, 1);
    assert.deepStrictEqual(frames[0], [{ dp: 1, value: true }, { dp: 3, value: 500 }]);
    c.destroy();
  });
  it('bounds the queue', async () => {
    const frames = [];
    const c = new DpCoalescer({ send: async (f) => frames.push(f), debounceMs: 5, maxQueue: 2, verifyMs: 0 });
    c.set(1, 1); c.set(2, 2); await c.set(3, 3);
    assert.deepStrictEqual(frames[0].map((x) => x.dp), [2, 3]);
    c.destroy();
  });
  it('wraps hue and preserves brightness', async () => {
    const frames = [];
    const c = new DpCoalescer({ send: async (f) => frames.push(f), debounceMs: 5, verifyMs: 0 });
    assert.strictEqual(DpCoalescer.wrapHue(360), 0);
    assert.strictEqual(DpCoalescer.wrapHue(-1), 359);
    await c.setColour(5, { h: 10, s: 1000, v: 300 });
    await c.setColour(5, { h: 725 });
    assert.deepStrictEqual(frames[1][0].value, { h: 5, s: 1000, v: 300 });
    c.destroy();
  });
  it('retries mismatched DPs once after read-back', async () => {
    const frames = [];
    const c = new DpCoalescer({ send: async (f) => frames.push(f), debounceMs: 5, verifyMs: 10, readBack: () => 0 });
    await c.set(3, 500);
    await wait(40);
    assert.strictEqual(frames.length, 2);
    assert.deepStrictEqual(frames[1], [{ dp: 3, value: 500 }]);
    c.destroy();
  });
  it('re-sends state after a stall and stops after destroy', async () => {
    const frames = [];
    const c = new DpCoalescer({ send: async (f) => frames.push(f), debounceMs: 5, verifyMs: 0, stallMs: 20 });
    await c.set(1, true);
    await wait(40);
    assert.strictEqual(frames.length, 2);
    c.destroy(); await wait(40);
    assert.strictEqual(frames.length, 2);
  });
});
