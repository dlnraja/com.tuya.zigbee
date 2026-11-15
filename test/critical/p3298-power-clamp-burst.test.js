'use strict';
// P3298 (CPU-limit diags b3f8c2c6 / b2e9ffe8, power_clamp_meter without manufacturerName/productId):
// clamp frame bursts wrote every meter capability and logged every DP. Writes are coalesced per capability
// and DP logs throttled per DP; the newest value is always written.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { MeterWriteCoalescer, KeyedLogThrottle } = require(path.join(ROOT, 'lib/utils/MeterWriteCoalescer'));

function clock() {
  let t = 1000; const timers = [];
  return {
    now: () => t,
    setTimer: (fn, ms) => { const h = { fn, at: t + ms, done: false }; timers.push(h); return h; },
    clearTimer: (h) => { if (h) { h.done = true; } },
    advance(ms) { t += ms; for (const h of timers) { if (!h.done && h.at <= t) { h.done = true; h.fn(); } } },
  };
}

describe('P3298 MeterWriteCoalescer', () => {
  it('skips identical values, coalesces a burst and writes the newest value', async () => {
    const c = clock(); const w = [];
    const m = new MeterWriteCoalescer({ now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer });
    for (let i = 0; i < 50; i++) { await m.submit('measure_power', i, (v) => w.push(v)); }
    assert.deepStrictEqual(w, [0]);
    assert.strictEqual(m.latest('measure_power'), 49);
    c.advance(2000);
    await Promise.resolve();
    assert.deepStrictEqual(w, [0, 49]);
    await m.submit('measure_power', 49, (v) => w.push(v));
    assert.deepStrictEqual(w, [0, 49], 'identical value skipped');
    c.advance(5 * 60 * 1000);
    await m.submit('measure_power', 49, (v) => w.push(v));
    assert.deepStrictEqual(w, [0, 49, 49], 'refresh after refreshMs');
  });
  it('a failing write is reported, never thrown; destroy cancels pending timers', async () => {
    const c = clock(); const errs = [];
    const m = new MeterWriteCoalescer({ now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer, onError: (cap, e) => errs.push(`${cap}:${e.message}`) });
    assert.strictEqual(await m.submit('measure_voltage', 230, () => { throw new Error('boom'); }), false);
    assert.strictEqual(await m.submit('measure_current', 1, () => Promise.reject(new Error('rej'))), false);
    assert.deepStrictEqual(errs, ['measure_voltage:boom', 'measure_current:rej']);
    const w = [];
    await m.submit('measure_voltage', 231, (v) => w.push(v));
    m.destroy(); c.advance(5000);
    assert.deepStrictEqual(w, []);
  });
  it('KeyedLogThrottle: one line per key per window with the muted count, bounded keys', () => {
    const c = clock(); const t = new KeyedLogThrottle({ now: c.now, windowMs: 60000, maxKeys: 4 });
    assert.strictEqual(t.line('112', 'a'), 'a');
    for (let i = 0; i < 9; i++) { assert.strictEqual(t.line('112', 'a'), null); }
    c.advance(60000);
    assert.match(t.line('112', 'b'), /^b \(\+9 muted in 60s\)$/);
    for (let i = 0; i < 20; i++) { t.line(`k${i}`, 'x'); }
    assert.ok(t._m.size <= 4);
  });
});

describe('P3298 power_clamp_meter burst handling', () => {
  function device(mfr) {
    const D = require(path.join(ROOT, 'drivers/power_clamp_meter/device.js'));
    const c = clock(); const raw = []; const logs = []; const caps = {};
    const d = Object.create(D.prototype);
    Object.assign(d, {
      getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : null), getStoreValue: () => null, hasCapability: () => true,
      getCapabilityValue: (k) => (caps[k] === undefined ? null : caps[k]), log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')),
      homey: { setTimeout: c.setTimer, clearTimeout: c.clearTimer }, _ctRatio: 1,
      _p3298RawSet: async (cap, v) => { raw.push([cap, v]); caps[cap] = v; },
    });
    const { MeterWriteCoalescer: M, KeyedLogThrottle: K } = require(path.join(ROOT, 'lib/utils/MeterWriteCoalescer'));
    d.__p3298c = new M({ now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer });
    d.__p3298t = new K({ now: c.now });
    return { d, c, raw, logs };
  }
  it('PJ-1203A: 60 voltage frames in a burst -> 2 writes (first + newest), few log lines', async () => {
    const { d, c, raw, logs } = device('_TZE204_81yrt3lo');
    for (let i = 0; i < 60; i++) { d._handleDP(112, 2250 + i); }
    c.advance(2000); await Promise.resolve();
    const v = raw.filter((r) => r[0] === 'measure_voltage');
    assert.strictEqual(v.length, 2, JSON.stringify(v));
    assert.strictEqual(v[v.length - 1][1], 230.9);
    assert.ok(logs.length <= 4, `logs=${logs.length}`);
  });
  it('no manufacturerName (3-phase fallback, the diag case): bursts are coalesced too', async () => {
    const { d, c, raw, logs } = device('');
    for (let i = 0; i < 60; i++) { d._handleDP(112, 2250 + (i % 3)); d._handleDP(115, 1000 + i); }
    c.advance(2000); await Promise.resolve();
    assert.ok(raw.length <= 4, JSON.stringify(raw));
    assert.deepStrictEqual(raw.filter((r) => r[0] === 'measure_power').pop(), ['measure_power', 105.9]);
    assert.ok(logs.length <= 4, `logs=${logs.length}`);
  });
  it('3-phase total power reads the newest phase values, not a stale capability', async () => {
    const { d, c, raw } = device('_TZE200_nslr42tt');
    d._handleDP(16, 100); d._handleDP(17, 200); d._handleDP(18, 300);
    await d._updateTotalPower();
    c.advance(2000); await Promise.resolve();
    assert.deepStrictEqual(raw.filter((r) => r[0] === 'measure_power').pop(), ['measure_power', 600]);
  });
});
