'use strict';

// P3040 (t525u, idea 3): CoupleGuard names the exact driver, adapts on the current driver
// (additive hotSwap profile), reports ONCE, then stays silent. Never unavailable, no re-pair dependency.
const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const beforeEach = testApi.beforeEach;
const G = require('../lib/utils/CoupleGuard');

function makeDev(over = {}) {
  const store = Object.assign({}, over.store || {});
  const ev = { warn: [], notif: [], profile: [], timers: [], unavailable: 0 };
  const dev = {
    driver: { id: over.driverId || 'curtain_motor' },
    getSetting: (k) => ({ zb_manufacturer_name: over.mfr || '_TZE200_BCUSNQT8', zb_product_id: over.pid || 'ts0601' }[k]),
    getStoreValue: (k) => store[k],
    setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); },
    setWarning: (m) => { ev.warn.push(m); return Promise.resolve(); },
    setUnavailable: () => { ev.unavailable++; return Promise.resolve(); },
    getName: () => 'Dev',
    log: () => {},
    hotSwap: {},
    hotSwapProfile: (t, c) => { ev.profile.push([t, c]); return Promise.resolve(); },
    homey: {
      setTimeout: (fn, ms) => { ev.timers.push(ms); fn(); return 1; },
      notifications: { createNotification: (n) => { ev.notif.push(n.excerpt); return Promise.resolve(); } },
    },
  };
  return { dev, store, ev };
}
const tick = () => new Promise((r) => setImmediate(r));

describe('P3040 CoupleGuard extension (exact driver, adapt, report once)', () => {
  beforeEach(() => G._reset());

  it('names the exact driver from the verified pins (case-insensitive) and from couple-guard.json', () => {
    assert.strictEqual(G.expectedDriver('curtain_motor', '_tze200_BCUSNQT8', 'TS0601'), 'din_rail_meter');
    assert.strictEqual(G.expectedDriver('din_rail_meter', '_TZE200_bcusnqt8', 'TS0601'), null);
    assert.strictEqual(G.expectedDriver('motion_sensor', '_TZE200_T5P1VJ8R', 'ts0601'), 'smoke_sensor_ts0601_dp');
    assert.strictEqual(G.expectedDriver('motion_sensor', '_TZE200_t5p1vj8r', 'TS0202'), null, 'per couple, not per mfr');
  });

  it('wrong driver: overlays the right profile, one warning + one notification naming it, no re-pair, never unavailable', async () => {
    const { dev, store, ev } = makeDev();
    const r = G.guard(dev);
    await tick();
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.target, 'din_rail_meter');
    assert.deepStrictEqual(ev.profile, [['din_rail_meter', 0.9]]);
    assert.strictEqual(ev.warn.length, 1);
    assert.strictEqual(ev.notif.length, 1);
    assert.ok(/"din_rail_meter"/.test(ev.warn[0]) && /no action is required/.test(ev.warn[0]));
    assert.ok(!/re-pair/i.test(ev.warn[0]), 'never asks for a re-pair');
    assert.strictEqual(ev.unavailable, 0);
    assert.strictEqual(store.expected_driver, 'din_rail_meter');
  });

  it('stays silent on later starts (store remembers), but still adapts', async () => {
    const first = makeDev();
    G.guard(first.dev); await tick();
    const { dev, ev } = makeDev({ store: first.store });
    G.guard(dev); await tick();
    assert.strictEqual(ev.warn.length, 0);
    assert.strictEqual(ev.notif.length, 0);
    assert.strictEqual(ev.profile.length, 1, 'profile overlay is re-applied each start');
  });

  it('right driver or unconstrained couple: nothing at all', async () => {
    const { dev, ev } = makeDev({ driverId: 'din_rail_meter' });
    assert.strictEqual(G.guard(dev).ok, true);
    const o = makeDev({ mfr: '_TZ3000_unknown', pid: 'TS011F' });
    assert.strictEqual(G.guard(o.dev).ok, true);
    await tick();
    assert.strictEqual(ev.warn.length + o.ev.warn.length + ev.profile.length + o.ev.profile.length, 0);
  });

  it('no hotSwap booted: no profile call, still reports once and never throws', async () => {
    const { dev, ev } = makeDev();
    dev.hotSwap = null;
    assert.doesNotThrow(() => G.guard(dev));
    await tick();
    assert.strictEqual(ev.profile.length, 0);
    assert.strictEqual(ev.warn.length, 1);
  });
});
