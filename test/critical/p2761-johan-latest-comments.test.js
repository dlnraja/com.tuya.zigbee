'use strict';

/**
 * P2761 — Johan latest comments Contre quoi (2026-09-28 evening)
 * #207 Fantem ZB003-X off wall_dimmer → motion_sensor
 * #1155 0hkmcrza+TS0203 contact (not climate)
 * #161 ladpngdx+TS0211 doorbell (not climate)
 * #613 hgu1dlak+TS0202 PIR (not climate)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function hasMfr(id, needle) {
  const n = String(needle).toLowerCase();
  return (compose(id).zigbee?.manufacturerName || []).some((m) => String(m).toLowerCase() === n);
}

function hasPid(id, pid) {
  return (compose(id).zigbee?.productId || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
}

describe('P2761 Johan latest-comment locks', () => {
  it('Fantem ZB003-X (#207) on motion_sensor+TS0202, not wall_dimmer_tuya', () => {
    for (const m of ['_TZ3210_zmy9hjay', '_TZ3210_0aqbrnts', '_TZ3210_rxqls8v0', '_TZ3210_wuhzzfqg', '_TZ3210_ohvnwamm', '_TZ3210_oekbi7o4']) {
      assert.equal(hasMfr('motion_sensor', m), true, `${m} → motion_sensor`);
      assert.equal(hasMfr('wall_dimmer_tuya', m), false, `${m} must leave dimmer`);
    }
    assert.equal(hasPid('motion_sensor', 'TS0202'), true);
    assert.equal(hasMfr('sensor_contact_motion', '_TZ3210_rxqls8v0'), false);
  });

  it('0hkmcrza+TS0203 contact (#1155), not climate_sensor', () => {
    assert.equal(hasMfr('contact_sensor', '_TZ3000_0hkmcrza'), true);
    assert.equal(hasPid('contact_sensor', 'TS0203'), true);
    assert.equal(hasMfr('climate_sensor', '_TZ3000_0hkmcrza'), false);
  });

  it('ladpngdx+TS0211 doorbell (#161), not climate_sensor', () => {
    assert.equal(hasMfr('doorbell', '_TZ1800_ladpngdx'), true);
    assert.equal(hasPid('doorbell', 'TS0211'), true);
    assert.equal(hasMfr('climate_sensor', '_TZ1800_ladpngdx'), false);
  });

  it('hgu1dlak+TS0202 PIR (#613), not climate_sensor', () => {
    assert.equal(hasMfr('pir_sensor_2', '_TZ3000_hgu1dlak'), true);
    assert.equal(hasPid('pir_sensor_2', 'TS0202'), true);
    assert.equal(hasMfr('climate_sensor', '_TZ3000_hgu1dlak'), false);
  });

  it('tank DP2 stays cm units (Johan #1477 / Z2M TLC2206)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/water_tank_monitor/device.js'), 'utf8');
    assert.ok(/case 2:.*cm/i.test(src));
    assert.ok(/P2761|DP2=cm/i.test(src));
    assert.equal(hasMfr('water_tank_monitor', '_TZE200_lvkk0hdg'), true);
    assert.equal(hasPid('water_tank_monitor', 'TS0601'), true);
  });
});
