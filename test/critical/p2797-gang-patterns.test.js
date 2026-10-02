'use strict';
/**
 * P2797 — gang patterns for couples on a 1-gang and a multi-gang driver, runtime add/hide.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { GangCountAdapter } = require('../../lib/devices/GangCountAdapter');
const PAT = require('../../lib/data/gang-patterns.json');

function fakeDevice(gangCount, mfr, pid, extra) {
  const caps = new Set(['onoff'].concat(extra || []));
  const store = {};
  return {
    gangCount, caps, store,
    getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid })[k],
    getData: () => ({}),
    hasCapability: (c) => caps.has(c),
    addCapability: async (c) => { caps.add(c); },
    removeCapability: async (c) => { caps.delete(c); },
    registerCapabilityListener: () => {},
    _setGangOnOff: async () => true,
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    log: () => {},
  };
}

const findKey = (n) => Object.keys(PAT.couples).find((k) => PAT.couples[k] === n && !PAT.ambiguous.includes(k));

test('runtime pattern file: shape, size, no synthetic ids', () => {
  const file = path.join(ROOT, 'lib/data/gang-patterns.json');
  assert.ok(fs.statSync(file).size <= 256 * 1024, 'size-gated (<= 256 KB)');
  assert.ok(Object.keys(PAT.couples).length > 0);
  for (const [k, n] of Object.entries(PAT.couples)) {
    assert.match(k, /^[^|]+\|[A-Z0-9-]+$/);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 8, k);
    assert.ok(!/_hybrid_|_generic_|dummy/i.test(k), k);
  }
  assert.ok(Array.isArray(PAT.ambiguous));
});

test('pid semantics: TS0012 → 2 gangs, TS0003 → 3 gangs', () => {
  assert.strictEqual(PAT.couples['_tze204_amp6tsvy|TS0012'], 2);
  assert.strictEqual(PAT.couples['_tze204_amp6tsvy|TS0003'], 3);
});

test('pattern couple on a 1-gang driver gets the extra gangs it reports', async () => {
  const k = findKey(3);
  const [m, p] = k.split('|');
  const dev = fakeDevice(1, m, p);
  const a = new GangCountAdapter(dev);
  assert.strictEqual(a.adaptive, true);
  assert.strictEqual(a.expected, 3);
  a._schedule = () => {};
  a.observeDp(1, true); a.observeDp(2, false); a.observeDp(3, true);
  await a.evaluate();
  assert.ok(dev.caps.has('onoff.gang2') && dev.caps.has('onoff.gang3'));
});

test('pattern says fewer gangs: hide only after settling, restore on report', async () => {
  const k = findKey(1);
  const [m, p] = k.split('|');
  const dev = fakeDevice(3, m, p, ['onoff.gang2', 'onoff.gang3']);
  const a = new GangCountAdapter(dev);
  a._schedule = () => {};
  a.observeDp(1, true);
  await a.evaluate();
  assert.ok(dev.caps.has('onoff.gang2'), 'not settled yet → nothing hidden');
  for (let i = 0; i < 12; i++) {a.observeDp(1, i % 2 === 0);}
  a.startedAt = Date.now() - 31 * 60 * 1000;
  await a.evaluate();
  assert.ok(!dev.caps.has('onoff.gang2') && !dev.caps.has('onoff.gang3'), 'hidden after settling');
  assert.deepStrictEqual(dev.store.gang_adapter_hidden, [2, 3]);
  a.observeDp(2, true);
  await new Promise((r) => setImmediate(r));
  assert.ok(dev.caps.has('onoff.gang2') && dev.caps.has('onoff.gang3'), 'restored when the device reports gang 2');
  assert.deepStrictEqual(dev.store.gang_adapter_hidden, []);
});

test('ambiguous or unlisted couples never hide manifest gangs', async () => {
  for (const [m, p] of [PAT.ambiguous.find((k) => !PAT.couples[k])?.split('|') || ['_tz3000_x', 'TS0601'], ['_tz3000_notlisted', 'TS0601']]) {
    const dev = fakeDevice(2, m, p, ['onoff.gang2']);
    const a = new GangCountAdapter(dev);
    a._schedule = () => {};
    for (let i = 0; i < 12; i++) {a.observeDp(1, true);}
    a.startedAt = Date.now() - 31 * 60 * 1000;
    await a.evaluate();
    assert.ok(dev.caps.has('onoff.gang2'), `${m}|${p} keeps gang 2`);
  }
});

test('gang-pattern report is wired into the enrichment workflow (report only) and excluded from the build', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/oss-lan-source-enrich.yml'), 'utf8');
  assert.ok(/scripts\/leads\/gang-patterns\.js/.test(wf));
  assert.ok(fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8').includes('data/leads/gang-patterns.json'));
});

test('enrichment pipeline: legacy couples stay removed, app.json resynced last, flow titles kept', () => {
  const { main } = require('../../tools/ci/enforce-dual-couple-legacy.js');
  assert.strictEqual(typeof main, 'function');
  const fleet = fs.readFileSync(path.join(ROOT, 'tools/ci/fleet-intelligent-enrich.js'), 'utf8');
  assert.ok(/enforce-dual-couple-legacy\.js', \['--sync'\]/.test(fleet));
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/fleet-intelligent-enrich.yml'), 'utf8');
  for (const g of ['enforce-dual-couple-legacy.js --sync', 'compose-appjson-fingerprint-sync-gate.js', 'flow-titleformatted-args-gate.js', 'p2794-dual-couples.test.js']) {
    assert.ok(wf.includes(g), g);
  }
  const flow = fs.readFileSync(path.join(ROOT, 'tools/ci/flow-fleet-enrich.js'), 'utf8');
  assert.ok(/titleFormatted !== undefined && JSON\.stringify\(card\.titleFormatted\)\.includes\('\[\[device\]\]'\)/.test(flow), 'strip only [[device]] titles');
  const cm = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
  assert.ok(!cm.zigbee.productId.includes('ZG-301Z') && !cm.zigbee.productId.includes('ZG-302Z1'));
});
