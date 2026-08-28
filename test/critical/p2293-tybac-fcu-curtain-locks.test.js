'use strict';

/**
 * P2293 — TYBAC-006 FCU TX/RX (issue #532) + Zemismart curtain couple locks
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2293 TYBAC FCU + curtain sacred locks', function () {
  it('wall_thermostat device.js has FCU DP28 fan_mode + DP2 system_mode branch', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_thermostat/device.js'), 'utf8');
    assert.ok(src.includes('FCU_DATA_POINTS'), 'FCU DP table');
    assert.ok(src.includes('fanMode: 28'), 'DP28 fan_mode');
    assert.ok(src.includes('systemMode: 2'), 'DP2 system_mode');
    assert.ok(/mpbki2zm/i.test(src) && /qujphad5/i.test(src), 'FCU sacred mfrs');
    assert.ok(src.includes("fan_only"), 'fan_only system mode');
  });

  it('fan_mode custom capability ships', () => {
    const cap = JSON.parse(
      fs.readFileSync(path.join(ROOT, '.homeycompose/capabilities/fan_mode.json'), 'utf8'),
    );
    assert.strictEqual(cap.type, 'enum');
    assert.deepStrictEqual(
      cap.values.map((v) => v.id),
      ['low', 'medium', 'high', 'auto'],
    );
  });

  it('curtain motors not claimed by TRV/thermostat', () => {
    const trv = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json'), 'utf8'));
    const wall = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wall_thermostat/driver.compose.json'), 'utf8'));
    const curtain = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const bad = ['68nvbio9', 'cf1sl3tj'];
    for (const needle of bad) {
      assert.ok(
        !(trv.zigbee.manufacturerName || []).some((m) => String(m).toLowerCase().includes(needle)),
        `device_radiator_valve must not claim ${needle}`,
      );
      assert.ok(
        !(wall.zigbee.manufacturerName || []).some((m) => String(m).toLowerCase().includes(needle)),
        `wall_thermostat must not claim ${needle}`,
      );
      assert.ok(
        (curtain.zigbee.manufacturerName || []).some((m) => String(m).toLowerCase().includes(needle)),
        `curtain_motor must claim ${needle}`,
      );
    }
  });

  it('registry locks curtain + DFGBTUB0 TS0044', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('p2293-zemismart-68nvbio9-curtain-not-trv'));
    assert.ok(ids.includes('p2293-zemismart-cf1sl3tj-curtain-not-trv'));
    assert.ok(ids.includes('p2293-dfgbtub0-ts0044-wireless-4'));
  });

  it('air_quality_co2 still owns ogkdpgy2 (issue #531)', () => {
    const co2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/air_quality_co2/driver.compose.json'), 'utf8'));
    const climate = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'), 'utf8'));
    assert.ok((co2.zigbee.manufacturerName || []).some((m) => /ogkdpgy2/i.test(m)));
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /ogkdpgy2/i.test(m)));
  });
});
