'use strict';
// P3065 D13 (t582u): trigger-storm soak — 1000 reports/min for 30 simulated minutes on shared generic
// cards: identical values debounced, per-device rate capped, guard maps bounded, heap flat.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { FlowStormGuard, BoundedLRU } = require('../../lib/flow/FlowStormGuard');
const { GenericDeviceCards } = require('../../lib/flow/GenericDeviceCards');
const { CapabilityValueCards } = require('../../lib/flow/CapabilityValueCards');

function host(argsById) {
  const cards = {};
  const mk = (id) => cards[id] = cards[id] || { id, fired: 0, acCalls: 0,
    registerRunListener(fn) { this.run = fn; return this; },
    registerArgumentAutocompleteListener(a, fn) { this.ac = this.ac || {}; this.ac[a] = fn; return this; },
    async trigger() { this.fired++; }, async getArgumentValues() { return argsById[id] || []; }, on() {} };
  return { cards, h: { homey: { flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'en' } },
    _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}

describe('P3065 D13 flow storm guard', () => {
  it('BoundedLRU never grows past its cap', () => {
    const l = new BoundedLRU(8);
    for (let i = 0; i < 1000; i++) {l.set(i, i);}
    assert.equal(l.size, 8);
    assert.equal(l.get(999), 999);
    assert.equal(l.get(0), undefined);
  });

  it('identical event debounced, changed value passes, per-minute cap holds', () => {
    let t = 0;
    const g = new FlowStormGuard({ now: () => t });
    assert.equal(g.allow('c', 'd', { v: 1 }), true);
    t = 200; assert.equal(g.allow('c', 'd', { v: 1 }), false);
    t = 300; assert.equal(g.allow('c', 'd', { v: 2 }), true);
    t = 1500; assert.equal(g.allow('c', 'd', { v: 2 }), true);
    let n = 0;
    for (let i = 0; i < 500; i++) { t = 2000 + i; if (g.allow('c', 'd', { v: i + 10 })) {n++;} }
    assert.ok(n <= 60, `cap ${n}`);
    t = 70000; assert.equal(g.allow('c', 'd', { v: 9999 }), true); // new window
  });

  it('soak: 1000 reports/min x 30 min, 5 chatty devices -> bounded fires, bounded maps, flat heap', async () => {
    const devices = Array.from({ length: 5 }, (_, i) => ({ getData: () => ({ id: `D${i}` }) }));
    const { cards, h } = host({ capability_value_delta: devices.map((d) => ({ device: d, capability: 'measure_power', min_delta: 0 })) });
    let t = 0;
    h._flowStormGuard = new FlowStormGuard({ now: () => t });
    const c = new CapabilityValueCards(h);
    c.register();
    await new Promise((r) => setImmediate(r));
    const realNow = Date.now;
    Date.now = () => t; // _argsFor cache uses Date.now
    try {
      if (global.gc) {global.gc();}
      const heap0 = process.memoryUsage().heapUsed;
      let reports = 0;
      for (let min = 0; min < 30; min++) {
        for (let k = 0; k < 1000; k++) {
          t = min * 60000 + k * 60;
          const d = devices[k % 5];
          // 200 reports/min per device; the value only changes every 20 reports (~1.2 s)
          const v = Math.floor(k / 20) % 2 ? 100 : 200;
          c.onCapabilityChanged(d, `D${k % 5}`, 'measure_power', v, v === 100 ? 200 : 100);
          reports++;
        }
      }
      if (global.gc) {global.gc();}
      const grow = process.memoryUsage().heapUsed - heap0;
      const fired = cards.capability_value_delta.fired;
      assert.equal(reports, 30000);
      assert.ok(fired <= reports / 4, `dedup: ${fired} fired of ${reports}`);
      assert.ok(fired <= 5 * 60 * 30, `per-device cap: ${fired}`);
      const st = h._flowStormGuard.stats();
      assert.ok(st.fireKeys <= 1024 && st.dropped > 0, JSON.stringify(st));
      assert.ok(grow < 16 * 1024 * 1024, `heap grew ${grow}`);
    } finally { Date.now = realNow; }
  });

  it('5000 distinct devices keep the guard map at its cap', () => {
    const g = new FlowStormGuard({ now: () => 0 });
    for (let i = 0; i < 5000; i++) {g.allow('x', `D${i}`, { v: i });}
    assert.ok(g.stats().fireKeys <= 1024);
  });

  it('autocomplete cached per card/device/query, invalidated on device add/delete, bounded', async () => {
    const { cards, h } = host({});
    let calls = 0;
    const c = new GenericDeviceCards(h);
    c._reg('condition', 'x_cond', async () => true, { capability: () => { calls++; return [{ id: 'a', name: 'A' }]; } });
    const dev = { getData: () => ({ id: 'D1' }) };
    await cards.x_cond.ac.capability('', { device: dev });
    await cards.x_cond.ac.capability('', { device: dev });
    assert.equal(calls, 1);
    require('../../lib/flow/FlowStormGuard').guardOf(h).invalidate();
    await cards.x_cond.ac.capability('', { device: dev });
    assert.equal(calls, 2);
    for (let i = 0; i < 300; i++) {await cards.x_cond.ac.capability(`q${i}`, { device: dev });}
    assert.ok(require('../../lib/flow/FlowStormGuard').guardOf(h).stats().acKeys <= 64);
  });

  it('device add/delete hook is wired', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.equal((src.match(/featureFlowCards\?\.onDeviceListChanged\?\.\(\)/g) || []).length, 2);
  });
});
