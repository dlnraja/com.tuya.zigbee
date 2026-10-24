'use strict';

// P3014 — user decision 2026-10-24: one driver per couple.
// TS0049 _TZ3000_cjfmu5he/_TZ3000_kz1anoi8/_TZ3000_mq4wujmp stay on water_valve_garden only,
// TS0601 _TZE284_la2c2uo9 stays on wall_dimmer_tuya only (Z2M TS0601 1-gang dimmer family).
// The removal is recorded in curated-couple-removals (bots must not re-add) and pinned on the kept driver.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const RESOLVED = [
  { mfr: '_tz3000_cjfmu5he', pid: 'TS0049', keep: 'water_valve_garden', drop: 'smart_garden_irrigation_control' },
  { mfr: '_tz3000_kz1anoi8', pid: 'TS0049', keep: 'water_valve_garden', drop: 'smart_garden_irrigation_control' },
  { mfr: '_tz3000_mq4wujmp', pid: 'TS0049', keep: 'water_valve_garden', drop: 'smart_garden_irrigation_control' },
  { mfr: '_tze284_la2c2uo9', pid: 'TS0601', keep: 'wall_dimmer_tuya', drop: 'dimmer_1_gang_tuya' },
];

function composeOwners() {
  const out = new Map();
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers')).sort()) {
    const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let z;
    try { z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {}; } catch (_e) { continue; }
    out.set(id, z);
  }
  return out;
}

function owners(zigbeeById, mfr, pid) {
  const res = [];
  for (const [id, z] of zigbeeById) {
    const m = [].concat(z.manufacturerName || []).map((s) => String(s).toLowerCase());
    const p = [].concat(z.productId || []).map((s) => String(s).toUpperCase());
    if (m.includes(mfr) && p.includes(pid)) {res.push(id);}
  }
  return res.sort();
}

test('each resolved couple is claimed by exactly one driver in driver.compose.json', () => {
  const z = composeOwners();
  for (const r of RESOLVED) {
    assert.deepStrictEqual(owners(z, r.mfr, r.pid), [r.keep], `${r.mfr}|${r.pid}`);
    const dropped = [].concat(z.get(r.drop)?.manufacturerName || []).map((s) => String(s).toLowerCase());
    assert.ok(!dropped.includes(r.mfr), `${r.mfr} fully removed from ${r.drop} (every case form, every productId)`);
  }
});

test('each resolved couple is claimed by exactly one driver in app.json', () => {
  const app = readJson('app.json');
  const z = new Map(app.drivers.map((d) => [d.id, d.zigbee || {}]));
  for (const r of RESOLVED) {
    assert.deepStrictEqual(owners(z, r.mfr, r.pid), [r.keep], `app.json ${r.mfr}|${r.pid}`);
  }
});

test('removal is documented (curated removal + pin) so automation cannot re-add it', () => {
  const curated = readJson('config/architecture/curated-couple-removals.json').removals;
  const pins = readJson('config/architecture/couple-driver-pins.json').pins;
  for (const r of RESOLVED) {
    const c = curated.find((e) => e.driver === r.drop && (e.mfr || []).some((m) => m.toLowerCase() === r.mfr));
    assert.ok(c, `curated removal for ${r.mfr} on ${r.drop}`);
    assert.match(c.why, /P3014/);
    assert.match(c.source, /zigbee-herdsman-converters/);
    const p = pins.find((e) => e.driver === r.keep && e.pid === r.pid && (e.mfr || []).some((m) => m.toLowerCase() === r.mfr));
    assert.ok(p, `pin ${r.mfr}|${r.pid} -> ${r.keep}`);
  }
});

test('master-only ledgers: dual-couple legacy entry and no frozen baseline exception', () => {
  const legacyP = path.join(ROOT, 'lib/data/dual-couple-legacy.json');
  if (fs.existsSync(legacyP)) {
    const legacy = JSON.parse(fs.readFileSync(legacyP, 'utf8')).drivers;
    for (const r of RESOLVED) {
      const e = legacy[r.drop];
      assert.ok(e && e.manufacturerName.some((m) => m.toLowerCase() === r.mfr), `legacy ${r.drop} lists ${r.mfr}`);
      assert.strictEqual(e.resolvedTo[r.mfr], r.keep);
    }
  }
  const baseP = path.join(ROOT, 'data/native-matrix-baseline.json');
  if (fs.existsSync(baseP)) {
    const dual = JSON.parse(fs.readFileSync(baseP, 'utf8')).dual || [];
    for (const r of RESOLVED) {
      assert.ok(!dual.some((x) => x.startsWith(`${r.mfr}|`) && x.includes(r.drop)), `baseline no longer freezes ${r.mfr} on ${r.drop}`);
    }
  }
});
