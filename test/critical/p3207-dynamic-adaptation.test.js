'use strict';

// P3207 (GH#598 generalised, credit oletorv): runtime descriptor-gated bindings + raw adaptive observer.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const A = require('../../lib/zigbee/DynamicBindingAdapter');
const O = require('../../lib/zigbee/RawAdaptiveObserver');
const audit = require('../../scripts/audit/binding-presence-audit');

function fakeCluster(id, opts = {}) {
  const C = class { static get ID() { return id; } };
  const c = new C();
  c.binds = 0; c.reports = 0; c.handlers = {};
  c.bind = async () => { c.binds++; if (opts.failBind && c.binds <= opts.failBind) {throw new Error('NO_ACK');} };
  c.configureReporting = async () => { c.reports++; };
  c.on = (ev, fn) => { c.handlers[ev] = fn; };
  return c;
}

function fakeDevice(driverId, caps = [], extra = {}) {
  const store = {};
  const capSet = new Set(caps);
  return Object.assign({
    driver: { id: driverId }, store, caps: capSet, values: {}, _destroyed: false,
    log() {}, getSetting() { return null; },
    getStoreValue(k) { return store[k]; }, async setStoreValue(k, v) { store[k] = v; },
    hasCapability(c) { return capSet.has(c); }, async addCapability(c) { capSet.add(c); },
    async setCapabilityValue(c, v) { this.values[c] = v; },
  }, extra);
}

describe('P3207 dynamic adaptation', () => {
  it('binds only clusters the node descriptor lists, never EF00', async () => {
    const temp = fakeCluster(1026); const pc = fakeCluster(1);
    const zcl = { endpoints: { 1: { _descriptor: { inputClusters: [0, 1, 1026, 61184], outputClusters: [] }, clusters: { temp, pc } } } };
    const dev = fakeDevice('x');
    const r = await A.attach(dev, zcl, { table: { x: { 1: [1, 1026, 1029, 61184] } } });
    assert.strictEqual(temp.binds, 1); assert.strictEqual(pc.binds, 1);
    assert.ok(r.skipped.includes('1:1029'), 'absent cluster skipped, not asked');
    assert.ok(!A.intendedFor('x', { table: { x: { 1: [61184] } } }).length, 'EF00 never in runtime binds');
  });

  it('GH#598 shape: TS0601 node with 0/4/5/EF00 gets zero bind requests', async () => {
    const zcl = { endpoints: { 1: { _descriptor: { inputClusters: [0, 4, 5, 61184], outputClusters: [10, 25] }, clusters: {} } } };
    const r = await A.attach(fakeDevice('lcdtemphumidsensor'), zcl);
    assert.deepStrictEqual(r.bound, []);
  });

  it('lazy capability on first real report, never removes', async () => {
    const temp = fakeCluster(1026);
    const zcl = { endpoints: { 1: { _descriptor: { inputClusters: [1026], outputClusters: [] }, clusters: { temp } } } };
    const dev = fakeDevice('x', ['onoff']);
    await A.attach(dev, zcl, { table: { x: { 1: [1026] } } });
    assert.ok(!dev.hasCapability('measure_temperature'), 'not added before a report');
    await temp.handlers['attr.measuredValue'](2150);
    assert.ok(dev.hasCapability('measure_temperature')); assert.ok(dev.hasCapability('onoff'));
    assert.strictEqual(dev.values.measure_temperature, 21.5);
  });

  it('sleepy node: failed bind retried on first wake frame, hook restored', async () => {
    const temp = fakeCluster(1026, { failBind: 1 });
    const orig = function () { return 'orig'; };
    const zcl = { handleFrame: orig, endpoints: { 1: { _descriptor: { inputClusters: [1026], outputClusters: [] }, clusters: { temp } } } };
    const dev = fakeDevice('x', [], { node: { receiveWhenIdle: false }, homey: { setTimeout: (f, ms) => setTimeout(f, ms) } });
    const r = await A.attach(dev, zcl, { table: { x: { 1: [1026] } } });
    assert.strictEqual(r.pending, 1); assert.notStrictEqual(zcl.handleFrame, orig);
    assert.strictEqual(zcl.handleFrame(1, 1026, Buffer.alloc(0)), 'orig');
    assert.strictEqual(zcl.handleFrame, orig);
    await new Promise(res => setTimeout(res, 700));
    assert.strictEqual(temp.binds, 2);
  });

  it('runtime-bindings table only lists drivers that exist, no EF00', () => {
    const t = require('../../lib/zigbee/data/runtime-bindings.json');
    for (const [d, row] of Object.entries(t)) {
      if (d.startsWith('_')) {continue;}
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json')), d);
      for (const l of Object.values(row)) {assert.ok(!l.includes(61184), d);}
    }
  });

  it('moved clusters are no longer manifest bindings (pairing asks nothing absent)', () => {
    const t = require('../../lib/zigbee/data/runtime-bindings.json');
    for (const [d, row] of Object.entries(t)) {
      if (d.startsWith('_')) {continue;}
      const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;
      for (const [ep, l] of Object.entries(row)) {for (const c of l) {assert.ok(!(z.endpoints[ep].bindings || []).includes(c), `${d} ep${ep} ${c}`);}}
    }
  });

  it('EF00 pairing bindings ratchet: no new driver binds 61184', () => {
    assert.ok(audit.audit().ef00LogicalBindings.length <= 33); // P3234: chain-aware (continuations = their root)
  });

  it('raw observer: bounded LRU, ZCL measurement added after 2 reports, kill switch', async () => {
    const dev = fakeDevice('x');
    for (let i = 0; i < 40; i++) {O.record(dev, `dp:${i}`, 2, i);}
    assert.strictEqual(Object.keys(O.snapshot(dev)).length, O.MAX_KEYS);
    assert.strictEqual(await O.observeZcl(dev, 1029, 'measuredValue', 5500), null);
    const r = await O.observeZcl(dev, 1029, 'measuredValue', 5600);
    assert.deepStrictEqual(r && r.cap, 'measure_humidity');
    assert.ok(dev.store.dyn_learned['zcl:1029.measuredValue']);
    const off = fakeDevice('x'); off.store.dyn_adapt_off = true;
    await O.observeZcl(off, 1026, 'measuredValue', 1); await O.observeZcl(off, 1026, 'measuredValue', 1);
    assert.ok(!off.hasCapability('measure_temperature'));
    assert.ok(!O.ADDITIVE.test('onoff') && O.ADDITIVE.test('measure_power'));
  });

  it('unknown DP without KB evidence never adds a capability', async () => {
    const dev = fakeDevice('x');
    for (let i = 0; i < 5; i++) {assert.strictEqual(await O.observeDp(dev, 199, i, 2), null);}
    assert.strictEqual(dev.caps.size, 0);
  });

  it('rule is in DYNAMIC_ADAPTATION.md and project-rules.js', () => {
    assert.ok(fs.readFileSync(path.join(ROOT, 'docs/rules/DYNAMIC_ADAPTATION.md'), 'utf8').includes('GH#598'));
    assert.ok(fs.readFileSync(path.join(ROOT, '.github/scripts/project-rules.js'), 'utf8').includes('P3207'));
  });
});
