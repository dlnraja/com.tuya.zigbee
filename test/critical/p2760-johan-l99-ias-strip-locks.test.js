'use strict';

/**
 * P2760 — Johan L99 Contre quoi (second wave)
 * - TS0207 IAS leak family stays on water_leak_sensor (not tuya twin)
 * - _TZE200_kb5noeto+TS0601 is IAS motion → pir_sensor_2 (not radar EF00)
 * - _TZ3000_air9m6af+TS011F → socket_power_strip_four_two (not usb_dongle)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'),
  );
}

function hasMfr(driverId, needle) {
  const mfrs = compose(driverId).zigbee?.manufacturerName || [];
  const n = String(needle).toLowerCase();
  return mfrs.some((m) => String(m).toLowerCase() === n);
}

function hasPid(driverId, pid) {
  const pids = compose(driverId).zigbee?.productId || [];
  return pids.some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
}

describe('P2760 Johan L99 IAS + strip locks', () => {
  it('Johan #1041 leak mfrs on water_leak_sensor, absent from water_leak_sensor_tuya', () => {
    for (const m of ['_TZ3000_4qaowtdo', '_TZ3000_qhozxs2b', '_TZ3000_bzt33cyu', '_TZ3000_bfopm9ga', '_TZ3000_baeiitad']) {
      assert.equal(hasMfr('water_leak_sensor', m), true, `${m} must stay IAS leak`);
      assert.equal(hasMfr('water_leak_sensor_tuya', m), false, `${m} must not collide on tuya twin`);
    }
  });

  it('Johan #1481 kb5noeto IAS motion on pir_sensor_2, not presence_sensor_radar', () => {
    assert.equal(hasMfr('pir_sensor_2', '_TZE200_kb5noeto'), true);
    assert.equal(hasPid('pir_sensor_2', 'TS0601'), true);
    assert.equal(hasMfr('presence_sensor_radar', '_TZE200_kb5noeto'), false);
  });

  it('Johan #1485 air9m6af 4-socket on socket_power_strip_four_two, not usb_dongle_triple', () => {
    assert.equal(hasMfr('socket_power_strip_four_two', '_TZ3000_air9m6af'), true);
    assert.equal(hasPid('socket_power_strip_four_two', 'TS011F'), true);
    assert.equal(hasMfr('usb_dongle_triple', '_TZ3000_air9m6af'), false);
  });
});
