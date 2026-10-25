'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// P3055 (owner yes t555u, 25/10/2026): the P3036d report listed 650 baseline combos that only exist
// because Homey pairs on manufacturerName x productId of a driver. Each exact couple got a decision
// (config/architecture/p3055-parasite-decisions.json, table in docs/knowledge/P3055_PARASITE_DECISIONS.md):
//  - attested couples (Z2M, ZHA, deCONZ, Blakadder, Johan, Hubitat, couple-guard, diag/forum data) keep
//    exactly the drivers they had;
//  - 250 parasites with no source are gone from their driver, also after publish-prep (baseline exemption,
//    so resolveBaselinePins cannot re-attach them);
//  - _TZE284_hodyryli + TS0601 (TuYa ZT08 weather station, Z2M tuya.ts, #513) pairs on climate_sensor_zt08
//    only: the sacred pin pointed at climate_sensor and the baseline re-attached 11 parasitic
//    hodyryli@climate_sensor couples, which put the mfr back on climate_sensor (dual with TS0601).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const {
  compactZigbeeIdentifiers, resolveBaselinePins, loadPublishBaseline,
} = require(path.join(ROOT, 'scripts', 'maintenance', 'compact-zigbee-identifiers.cjs'));
const { checkBaseline } = require(path.join(ROOT, 'scripts', 'maintenance', 'publish-baseline-gate.cjs'));

const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'p3055-parasite-decisions.json'), 'utf8'));
const sacred = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json'), 'utf8')).couples;
const source = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const owners = (drivers, m, p) => drivers
  .filter((d) => d.zigbee && (d.zigbee.manufacturerName || []).includes(m) && (d.zigbee.productId || []).includes(p))
  .map((d) => d.id).sort();
const has = (drivers, id, m, p) => owners(drivers, m, p).includes(id);
const [HM, HP] = D.hodyryli.couple;

let payload;
function getPayload() {
  if (!payload) {
    payload = source();
    const cwd = process.cwd();
    process.chdir(ROOT);
    try { payload.__r = compactZigbeeIdentifiers(payload, {}); } finally { process.chdir(cwd); }
  }
  return payload;
}

describe('P3055 parasite decisions', function () {
  if (this && this.timeout) this.timeout(180000);

  it('decision file covers the 650 P3036d combos', () => {
    assert.strictEqual(D.removed.length + D.attested.length + D.keptCollateral, 650);
    assert.ok(D.removed.length >= 250 && D.attested.length >= 108);
  });

  it('source: attested couples keep the same non-empty driver set, removed combos left their driver', () => {
    const drivers = source().drivers;
    for (const [m, p, id, own] of D.attested) {
      assert.deepStrictEqual(owners(drivers, m, p), [...own].sort(), `${m}+${p}`);
      assert.ok(own.includes(id), `${m}+${p} still on ${id}`);
    }
    for (const [m, p, id] of D.removed) assert.ok(!has(drivers, id, m, p), `${m}+${p} still on ${id}`);
  });

  it('source + sacred pin: hodyryli+TS0601 only on climate_sensor_zt08', () => {
    assert.deepStrictEqual(owners(source().drivers, HM, HP), [D.hodyryli.driverId]);
    const pins = sacred.filter((c) => c.mfr.toLowerCase() === HM.toLowerCase());
    assert.ok(pins.length >= 1);
    for (const c of pins) assert.strictEqual(c.driverId, D.hodyryli.driverId, JSON.stringify(c));
  });

  it('baseline re-attach: no pin puts a removed couple or hodyryli back on climate_sensor', () => {
    const m = source();
    const r = resolveBaselinePins(m, loadPublishBaseline(ROOT));
    assert.deepStrictEqual(r.unresolved, []);
    const removed = new Set(D.removed.map(([a, b, c]) => `${a}\u0000${b}\u0000${c}`));
    for (const pin of r.pins) {
      assert.ok(!removed.has(`${pin.mfr}\u0000${pin.pid}\u0000${pin.driverId}`), `re-attached ${JSON.stringify(pin)}`);
      if (pin.mfr.toLowerCase() === HM.toLowerCase()) assert.strictEqual(pin.driverId, D.hodyryli.driverId, JSON.stringify(pin));
    }
  });

  it('publish payload: hodyryli single driver, parasites absent, attested kept, baseline gate green', () => {
    const m = getPayload();
    assert.strictEqual(m.__r.overTotalLimit, false);
    assert.deepStrictEqual(m.__r.sacredMissing || [], []);
    assert.deepStrictEqual(owners(m.drivers, HM, HP), [D.hodyryli.driverId]);
    assert.ok(!m.drivers.some((d) => d.id === 'climate_sensor' && d.zigbee
      && (d.zigbee.manufacturerName || []).some((x) => x.toLowerCase() === HM.toLowerCase())), 'hodyryli back on climate_sensor');
    for (const [a, b, id] of D.removed) assert.ok(!has(m.drivers, id, a, b), `${a}+${b} re-attached on ${id}`);
    for (const [a, b, , own] of D.attested) assert.ok(owners(m.drivers, a, b).length > 0, `${a}+${b} lost`);
    for (const [a, b, id] of D.guardPins) assert.ok(has(m.drivers, id, a, b), `${a}+${b} guard pin on ${id}`);
    assert.deepStrictEqual(checkBaseline(m, loadPublishBaseline(ROOT)).missing, []);
  });
});
