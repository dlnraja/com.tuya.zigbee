'use strict';
/**
 * P2794 — dual-couple classification, clear-evidence resolution, runtime gang adapter.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const D = require('../../scripts/leads/dual-couples.js');
const { GangCountAdapter, gangsFromDps, gangsFromEndpoints } = require('../../lib/devices/GangCountAdapter');

const mk = (id, cls, gang, mfrs, pids, cats) => [id, { id, cls, caps: [], gang, cats: new Set(cats || (gang ? ['switch'] : [])), mfrs: new Set(mfrs), pids: new Set(pids) }];
const emptyEv = () => ({ dpGang: new Map(), z2mGang: new Map(), external: new Set(), internal: new Set(), registry: new Map(), protectedPairs: new Set() });

test('pidKind: gang families, plug, DP', () => {
  assert.deepStrictEqual(D.pidKind('TS0012'), { kind: 'gang', gang: 2, cat: 'switch' });
  assert.strictEqual(D.pidKind('TS0004').gang, 4);
  assert.strictEqual(D.pidKind('TS011F').cat, 'plug');
  assert.strictEqual(D.pidKind('TS0601').kind, 'dp');
});

test('classify: productId gang count picks the matching switch driver', () => {
  const drivers = new Map([mk('s1', 'socket', 1, ['_tz3000_aaaaaaaa'], ['TS0002', 'TS0601']), mk('s2', 'socket', 2, ['_tz3000_aaaaaaaa'], ['TS0002', 'TS0601'])]);
  const ev = emptyEv();
  ev.external.add('_tz3000_aaaaaaaa|TS0002');
  const r = D.classify({ mfr: '_tz3000_aaaaaaaa', pid: 'TS0002', drivers: ['s1', 's2'] }, drivers, ev);
  assert.strictEqual(r.verdict, 'clear');
  assert.strictEqual(r.winner, 's2');
  // TS0601 without DP evidence → adapter
  ev.external.add('_tz3000_aaaaaaaa|TS0601');
  assert.strictEqual(D.classify({ mfr: '_tz3000_aaaaaaaa', pid: 'TS0601', drivers: ['s1', 's2'] }, drivers, ev).verdict, 'adapt');
  // DP1 + DP2 → 2 gangs
  ev.dpGang.set('_tz3000_aaaaaaaa', 2);
  assert.strictEqual(D.classify({ mfr: '_tz3000_aaaaaaaa', pid: 'TS0601', drivers: ['s1', 's2'] }, drivers, ev).winner, 's2');
  // conflicting evidence → adapter
  assert.strictEqual(D.classify({ mfr: '_tz3000_aaaaaaaa', pid: 'TS0002', drivers: ['s1', 's2'] }, drivers, { ...ev, dpGang: new Map([['_tz3000_aaaaaaaa', 1]]) }).verdict, 'adapt');
});

test('classify: registry beats heuristics; unreported couples are only kept', () => {
  const drivers = new Map([mk('a', 'light', null, ['x'], ['P1'], ['light']), mk('b', 'socket', 1, ['x'], ['P1'])]);
  const ev = emptyEv();
  assert.strictEqual(D.classify({ mfr: 'x', pid: 'P1', drivers: ['a', 'b'] }, drivers, ev).verdict, 'kept');
  ev.registry.set('x|P1', { canonical: 'b', forbidden: [], id: 'r1' });
  assert.strictEqual(D.classify({ mfr: 'x', pid: 'P1', drivers: ['a', 'b'] }, drivers, ev).winner, 'b');
});

test('resolution: productId dropped from the losing driver only when nothing reported is lost', () => {
  const drivers = new Map([
    mk('sw', 'socket', 1, ['brand', 'other'], ['ZG-1', 'TS0001']),
    mk('cv', 'windowcoverings', null, ['brand', 'third'], ['ZG-1', 'ZG-1-MOTO'], ['cover']),
  ]);
  const ev = emptyEv();
  ev.registry.set('brand|ZG-1', { canonical: 'sw', forbidden: [], id: 'r' });
  ev.internal.add('brand|ZG-1-MOTO');
  const results = D.dualCouples(drivers).map((c) => ({ ...c, ...D.classify(c, drivers, ev) }));
  const props = D.proposeResolutions(results, drivers, ev);
  assert.strictEqual(props.length, 1);
  assert.strictEqual(props[0].action, 'remove-productId');
  assert.deepStrictEqual(props[0].remove, ['ZG-1']);
  // if another manufacturerName on the losing driver is reported with that productId → keep
  ev.external.add('third|ZG-1');
  const props2 = D.proposeResolutions(results, drivers, ev);
  assert.strictEqual(props2[0].status, 'keep');
});

test('applied resolution: HOBEIAN ZG-301Z / ZG-302Z1 pair to switch_1gang only; paired curtain devices stay quiet', () => {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8')).zigbee;
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'), 'utf8')).zigbee;
  assert.ok(!c.productId.some((p) => ['ZG-301Z', 'ZG-302Z1'].includes(String(p).toUpperCase())));
  assert.ok(c.productId.some((p) => /ZG-301Z-MOTO/i.test(p)), 'curtain variant kept');
  assert.ok(s.productId.includes('ZG-301Z') && s.productId.includes('ZG-302Z1'));
  assert.ok(s.manufacturerName.some((m) => m.toLowerCase() === 'hobeian'));
  const legacy = require('../../lib/data/dual-couple-legacy.json');
  assert.deepStrictEqual(legacy.drivers.curtain_motor.productId, ['ZG-301Z', 'ZG-302Z1']);
  assert.ok(/dual-couple-legacy\.json/.test(fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8')));
});

function fakeDevice(gangCount, mfr, pid) {
  const caps = new Set(['onoff']);
  const store = {};
  const logs = [];
  return {
    gangCount, caps, store, logs,
    getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid })[k],
    getData: () => ({}),
    hasCapability: (c) => caps.has(c),
    addCapability: async (c) => { caps.add(c); },
    removeCapability: async (c) => { caps.delete(c); },
    registerCapabilityListener: () => {},
    _setGangOnOff: async () => true,
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    log: (m) => logs.push(m),
  };
}

test('gang adapter: DP/endpoint counting', () => {
  assert.strictEqual(gangsFromDps(new Set([1, 2])), 2);
  assert.strictEqual(gangsFromDps(new Set([2])), 0);
  assert.strictEqual(gangsFromEndpoints({ endpoints: { 1: { clusters: { onOff: {} } }, 2: { clusters: { onOff: {} } }, 3: { clusters: {} } } }), 2);
});

test('gang adapter: adds gangs only for listed couples, hint for everyone, never removes manifest capabilities', async () => {
  const listed = Object.keys(require('../../lib/data/dual-couple-adapt.json').couples)[0];
  assert.ok(listed, 'adapt list not empty');
  const [m, p] = listed.split('|');
  const dev = fakeDevice(1, m, p);
  const a = new GangCountAdapter(dev);
  assert.strictEqual(a.adaptive, true);
  a._schedule = () => {};
  a.observeDp(1, true); a.observeDp(2, false); a.observeDp(17, true); a.observeDp(3, 55);
  await a.evaluate();
  assert.ok(dev.caps.has('onoff.gang2'));
  assert.deepStrictEqual(dev.store.gang_adapter_added, [2]);
  assert.strictEqual(dev.store.gang_adapter_hint.suggest, 'switch_2gang');

  const other = fakeDevice(1, '_tz3000_notlisted', 'TS0601');
  const b = new GangCountAdapter(other);
  b._schedule = () => {};
  b.observeDp(1, true); b.observeDp(2, true);
  await b.evaluate();
  assert.ok(!other.caps.has('onoff.gang2'), 'not listed → hint only');
  assert.strictEqual(other.store.gang_adapter_hint.observed, 2);

  const two = fakeDevice(2, m, p);
  two.caps.add('onoff.gang2');
  const c = new GangCountAdapter(two);
  c._schedule = () => {};
  c.observeDp(1, true);
  await c.evaluate();
  assert.ok(two.caps.has('onoff.gang2'), 'manifest gang kept');
});

test('dual-couple report is wired into the enrichment workflow (report only)', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/oss-lan-source-enrich.yml'), 'utf8');
  assert.ok(/scripts\/leads\/dual-couples\.js(?! --apply)/.test(wf));
  assert.ok(!/dual-couples\.js --apply/.test(wf));
});
