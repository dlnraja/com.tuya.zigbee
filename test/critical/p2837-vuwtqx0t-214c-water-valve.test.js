'use strict';

/**
 * P2837 Contre quoi: forum tip 101901/8 interview
 * `_TZE284_vuwtqx0t`+`TS0601` (Zemismart 214C) stays on water_valve_smart.
 * Never contact_sensor; never compose OnOff 6 or 0xED00.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(driver) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'), 'utf8'));
}

function hasMfr(driver, name) {
  return (compose(driver).zigbee?.manufacturerName || []).some(
    (m) => String(m).toLowerCase() === String(name).toLowerCase()
  );
}

function hasPid(driver, pid) {
  return (compose(driver).zigbee?.productId || []).some(
    (p) => String(p).toUpperCase() === String(pid).toUpperCase()
  );
}

describe('P2837 vuwtqx0t Zemismart 214C water valve', () => {
  it('compose: couple on water_valve_smart with EF00-only clusters', () => {
    assert.ok(hasMfr('water_valve_smart', '_TZE284_vuwtqx0t'));
    assert.ok(hasMfr('water_valve_smart', '_TZE200_vuwtqx0t'));
    assert.ok(hasPid('water_valve_smart', 'TS0601'));
    const clusters = compose('water_valve_smart').zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(clusters.includes(61184), 'EF00 required');
    assert.equal(clusters.includes(6), false, 'must not force OnOff 6 (interview EF00-only)');
    assert.equal(clusters.includes(60672), false, 'must not compose 0xED00');
  });

  it('Contre quoi: not on contact_sensor / garden', () => {
    assert.equal(hasMfr('contact_sensor', '_TZE284_vuwtqx0t'), false);
    assert.equal(hasMfr('water_valve_garden', '_TZE284_vuwtqx0t'), false);
  });

  it('runtime fingerprints + shards route to water_valve_smart', () => {
    const fp = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/tuya/fingerprints.json'), 'utf8'));
    assert.equal(fp['_TZE284_vuwtqx0t']?.driverId, 'water_valve_smart');
    assert.equal(fp['_TZE200_vuwtqx0t']?.driverId, 'water_valve_smart');
    const s284 = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/tuya/fp-shards/TZE284_v.json'), 'utf8'));
    const s200 = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/tuya/fp-shards/TZE200_v.json'), 'utf8'));
    assert.equal(s284['_TZE284_vuwtqx0t']?.driverId, 'water_valve_smart');
    assert.equal(s200['_TZE200_vuwtqx0t']?.driverId, 'water_valve_smart');
  });

  it('sacred-keep + misattribution lock', () => {
    const keep = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const hit = (keep.couples || []).find((c) => c.mfr === '_TZE284_vuwtqx0t' && c.pid === 'TS0601');
    assert.ok(hit);
    assert.equal(hit.driverId, 'water_valve_smart');
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const caseHit = (reg.cases || []).find((c) => c.id === 'p2837-vuwtqx0t-zemismart-214c-water-valve');
    assert.ok(caseHit);
    assert.equal(caseHit.canonicalDriver, 'water_valve_smart');
    assert.ok((caseHit.forbiddenDrivers || []).includes('contact_sensor'));
  });
});
