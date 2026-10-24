'use strict';

// P3018b — optional low-confidence inferred DP family layer + per-device confirmation memory.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const L = require('../../lib/zigbee/InferredDpLayer');
const { build } = require('../../scripts/data/build-inferred-dp-family');

function dev({ mfr = '_TZE200_3ejwxpmu', pid = 'TS0601', driver = 'air_quality_co2', caps = ['measure_temperature'], store = {} } = {}) {
  return {
    driver: { id: driver },
    _store: store,
    getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid })[k] || null,
    getStoreValue(k) { return this._store[k]; },
    setStoreValue(k, v) { this._store[k] = JSON.parse(JSON.stringify(v)); return Promise.resolve(); },
    hasCapability: (c) => caps.includes(c),
  };
}

test('candidate: same pid+driver family, labelled inferred; exact couple DP has none', () => {
  const c = L.candidate(dev(), 18);
  assert.ok(c, 'family candidate');
  assert.strictEqual(c.label, 'inferred');
  assert.strictEqual(c.tier, 'pid');
  assert.strictEqual(c.name, 'temperature');
  assert.ok(c.support >= 2 && c.support / c.total >= 2 / 3);
  assert.strictEqual(L.candidate(dev({ mfr: '_TZE200_exfrnlow', driver: 'radiator_valve' }), 102), null, 'exact converter → no inferred');
});

test('writes only after 3 valid reports for THIS device, then remembers it', async () => {
  const d = dev();
  const r1 = L.observe(d, 18, 215);
  assert.strictEqual(r1.state, 'pending');
  assert.strictEqual(r1.capability, null);
  assert.strictEqual(r1.value, 21.5);
  assert.strictEqual(L.observe(d, 18, 215).state, 'pending', 'duplicate delivery counted once');
  L.observe(d, 18, 216);
  const r3 = L.observe(d, 18, 217);
  assert.strictEqual(r3.state, 'confirmed');
  assert.strictEqual(r3.capability, 'measure_temperature');
  assert.strictEqual(r3.value, 21.7);
  assert.ok(d._store[L.STORE_KEY]['18'].st === 'c');
  // new device object (app restart) with the same store: still confirmed
  const d2 = dev({ store: d._store });
  assert.strictEqual(L.observe(d2, 18, 220).capability, 'measure_temperature');
});

test('one out-of-range report rejects the interpretation for that device for good', () => {
  const d = dev();
  const r = L.observe(d, 18, 99999); // 9999.9 °C
  assert.strictEqual(r.state, 'rejected');
  for (let i = 0; i < 5; i++) { assert.strictEqual(L.observe(d, 18, 200 + i).capability, null); }
  assert.strictEqual(d._store[L.STORE_KEY]['18'].st, 'r');
});

test('never writes a capability the device lacks, or one the driver owns', () => {
  const d = dev({ caps: [] });
  for (let i = 0; i < 4; i++) { L.observe(d, 18, 200 + i); }
  const r = L.observe(d, 18, 210);
  assert.strictEqual(r.state, 'confirmed');
  assert.strictEqual(r.capability, null);
  assert.strictEqual(r.reason, 'capability-absent');
  const o = dev();
  o.dpMappings = { 1: { capability: 'measure_temperature' } };
  for (let i = 0; i < 4; i++) { L.observe(o, 18, 200 + i); }
  assert.strictEqual(L.observe(o, 18, 211).reason, 'driver-owns-capability');
});

test('builder: dominant agreement thresholds per tier, exact rows only', () => {
  const rows = {
    'a|TS0601': [{ dp: 5, name: 'temperature', conv: 'div:10' }],
    'b|TS0601': [{ dp: 5, name: 'temperature', conv: 'div:10' }],
    'c|TS0601': [{ dp: 5, name: 'temperature', conv: 'div:100' }],
    'd|TS0601': [{ dp: 5, name: 'temperature', conv: null }],
  };
  const out = build({ drivers: [{ id: 'x', pids: ['TS0601'], mfrs: ['a', 'b', 'c', 'd'] }], coupleDps: (m, p) => rows[`${m}|${p}`] || [] });
  const f = out.fam['TS0601|x'];
  assert.deepStrictEqual([f[0], out.names[f[1]], out.convs[f[2]], f[3], f[4]], [5, 'temperature', 'div:10', 2, 3]);
  assert.ok(!out.fam['*|x'], 'category tier needs ≥ 3 couples at ≥ 3/4');
});

test('shipped data bounded + documented', () => {
  const p = path.join(__dirname, '..', '..', 'lib', 'zigbee', 'data', 'inferred-dp-family.json');
  assert.ok(fs.statSync(p).size < 60000);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(j.label, 'inferred');
  const doc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'knowledge', 'KB', 'DP_ENDPOINT_COVERAGE.md'), 'utf8');
  assert.ok(doc.includes('Inferred family layer'));
  const sh = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'kb', 'refresh.sh'), 'utf8');
  assert.ok(sh.includes('build-inferred-dp-family.js'));
});
