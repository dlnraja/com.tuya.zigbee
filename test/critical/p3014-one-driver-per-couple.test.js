'use strict';

// P3014 — user decision 2026-10-24: one driver per couple.
// On stable the TS0049 irrigation couples already live on water_valve_garden only, and
// _TZE284_la2c2uo9 (TS0601) only on dimmer_1_gang_tuya. This guards both from turning into duplicates.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const COUPLES = [
  { mfr: '_tz3000_cjfmu5he', pid: 'TS0049', owner: 'water_valve_garden' },
  { mfr: '_tz3000_kz1anoi8', pid: 'TS0049', owner: 'water_valve_garden' },
  { mfr: '_tz3000_mq4wujmp', pid: 'TS0049', owner: 'water_valve_garden' },
  { mfr: '_tze284_la2c2uo9', pid: 'TS0601', owner: 'dimmer_1_gang_tuya' },
];

function owners(zigbeeById, mfr, pid) {
  const res = [];
  for (const [id, z] of zigbeeById) {
    const m = [].concat(z.manufacturerName || []).map((s) => String(s).toLowerCase());
    const p = [].concat(z.productId || []).map((s) => String(s).toUpperCase());
    if (m.includes(mfr) && p.includes(pid)) {res.push(id);}
  }
  return res.sort();
}

function composeZigbee() {
  const out = new Map();
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers')).sort()) {
    const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    try { out.set(id, JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {}); } catch (_e) { /* skip */ }
  }
  return out;
}

test('each guarded couple is claimed by exactly one driver (compose + app.json)', () => {
  const compose = composeZigbee();
  const app = new Map(readJson('app.json').drivers.map((d) => [d.id, d.zigbee || {}]));
  for (const c of COUPLES) {
    assert.deepStrictEqual(owners(compose, c.mfr, c.pid), [c.owner], `compose ${c.mfr}|${c.pid}`);
    assert.deepStrictEqual(owners(app, c.mfr, c.pid), [c.owner], `app.json ${c.mfr}|${c.pid}`);
  }
});

test('irrigation removal from smart_garden_irrigation_control is recorded as curated', () => {
  const curated = readJson('config/architecture/curated-couple-removals.json').removals;
  for (const c of COUPLES.filter((x) => x.pid === 'TS0049')) {
    const e = curated.find((r) => r.driver === 'smart_garden_irrigation_control' && r.mfr.some((m) => m.toLowerCase() === c.mfr));
    assert.ok(e, c.mfr);
    assert.match(e.source, /zigbee-herdsman-converters/);
  }
});
