'use strict';

const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('P2432 — Forum Media Sweep & Misattribution Cleansing', () => {

  it('drivers/wall_switch_5_gang_tuya does not contain misattributed manufacturers', () => {
    const p = path.join(__dirname, '../../drivers/wall_switch_5_gang_tuya/driver.compose.json');
    assert.ok(fs.existsSync(p), 'wall_switch_5_gang_tuya must exist');
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    const mfrs = (d.zigbee?.manufacturerName || []).map(m => m.toLowerCase());
    const forbiddenMfrs = ['aqnazj70', 'dfxkcots', 'fjjbhx9d', 'mexisfik', 'p0gzbqct', 'qeqvmvti'];
    for (const f of forbiddenMfrs) {
      assert.ok(
        !mfrs.some(m => m.includes(f)),
        `wall_switch_5_gang_tuya must NOT contain misattributed manufacturer: ${f}`
      );
    }
  });

  it('DeviceFingerprintDB resolves all 25 forum devices accurately', () => {
    const db = require('../../lib/DeviceFingerprintDB');
    const testCases = [
      ['_TZE200_aqnazj70', 'TS0601', 'switch_4gang'],
      ['_TZE200_dfxkcots', 'TS0601', 'wall_dimmer_tuya'],
      ['_TZE200_fjjbhx9d', 'TS0601', 'dimmer_2_gang_tuya'],
      ['_TZE200_mexisfik', 'TS0601', 'switch_4gang'],
      ['_TZE200_p0gzbqct', 'TS0601', 'wall_dimmer_tuya'],
      ['_TYZB01_qeqvmvti', 'TS0011', 'switch_1gang'],
      ['_TZ3000_mmkbptmx', 'TS0004', 'switch_4gang'],
      ['_TZ3000_ruxexjfz', 'TS0002', 'switch_2gang'],
      ['_TZE200_2ekuz3dz', 'TS0601', 'wall_thermostat'],
      ['_TZ3000_upgcbody', 'TS0207', 'water_leak_sensor'],
      ['_TZ3000_wkr3jqmr', 'TS0004', 'switch_4gang'],
      ['_TZ3000_3dfewsk1', 'TS0207', 'water_leak_sensor'],
      ['_TZ3000_wkai4ga5', 'TS0042', 'button_wireless_2'],
      ['_TZE204_qasjif9e', 'TS0601', 'presence_sensor_radar'],
      ['_TZE204_sxm7l9xa', 'TS0601', 'presence_sensor_radar'],
      ['_TZE200_3p5ydos3', 'TS0601', 'wall_dimmer_tuya'],
      ['_TZE204_hlx9tnzb', 'TS0601', 'dimmer_1_gang_tuya'],
      ['_TZE204_zenj4lxv', 'TS0601', 'dimmer_2_gang_tuya'],
      ['_TZB210_rkgngb5o', 'TS0502B', 'bulb_tunable_white'],
      ['_TZE200_3towulqd', 'TS0601', 'presence_sensor_radar'],
      ['_TYZB01_6g8b7at8', 'TS0012', 'switch_2gang'],
      ['_TZ3210_0zabbfax', 'TS0503B', 'light_bulb_rgb'],
      ['_TZE204_ex3rcdha', 'TS0601', 'presence_sensor_radar'],
      ['_TZE200_yjjdcqsq', 'TS0601', 'climate_sensor'],
      ['_TZE200_mja3fuja', 'TS0601', 'air_quality_comprehensive']
    ];

    for (const [mfr, pid, expectedDriver] of testCases) {
      const match = db.lookup(mfr, pid);
      assert.ok(match, `Must find lookup for ${mfr}|${pid}`);
      assert.strictEqual(
        match.driver,
        expectedDriver,
        `Expected ${mfr}|${pid} -> ${expectedDriver}, got ${match.driver}`
      );
    }
  });

  it('user-misattribution-registry locks rotary dimmers and switches away from wall_switch_5_gang_tuya and air_purifier', () => {
    const regPath = path.join(__dirname, '../../data/user-misattribution-registry.json');
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));

    const dfx = reg.cases.find(c => c.id === 'p2432-dze200-dfxkcots-rotary-dimmer');
    assert.ok(dfx, 'dfxkcots case must exist');
    assert.strictEqual(dfx.canonicalDriver, 'wall_dimmer_tuya');
    assert.ok(dfx.forbiddenDrivers.includes('wall_switch_5_gang_tuya'));
    assert.ok(dfx.forbiddenDrivers.includes('air_purifier'));

    const p0g = reg.cases.find(c => c.id === 'p2432-dze200-p0gzbqct-rotary-knob-dimmer');
    assert.ok(p0g, 'p0gzbqct case must exist');
    assert.strictEqual(p0g.canonicalDriver, 'wall_dimmer_tuya');
    assert.ok(p0g.forbiddenDrivers.includes('wall_switch_5_gang_tuya'));
    assert.ok(p0g.forbiddenDrivers.includes('air_purifier'));

    const mja = reg.cases.find(c => c.id === 'p2432-dze200-mja3fuja-air-quality');
    assert.ok(mja, 'mja3fuja case must exist');
    assert.strictEqual(mja.canonicalDriver, 'air_quality_comprehensive');
    assert.ok(mja.forbiddenDrivers.includes('air_purifier'));
  });

  it('publish-sacred-keep-couples.json pins new verified couples', () => {
    const p = path.join(__dirname, '../../config/architecture/publish-sacred-keep-couples.json');
    assert.ok(fs.existsSync(p));
    const sacred = JSON.parse(fs.readFileSync(p, 'utf8'));
    const couples = sacred.couples || [];

    const expectedPins = [
      { mfr: '_TZE200_aqnazj70', pid: 'TS0601', driverId: 'switch_4gang' },
      { mfr: '_TZE200_dfxkcots', pid: 'TS0601', driverId: 'wall_dimmer_tuya' },
      { mfr: '_TZE200_fjjbhx9d', pid: 'TS0601', driverId: 'dimmer_2_gang_tuya' },
      { mfr: '_TZE200_p0gzbqct', pid: 'TS0601', driverId: 'wall_dimmer_tuya' },
      { mfr: '_TYZB01_qeqvmvti', pid: 'TS0011', driverId: 'switch_1gang' },
      { mfr: '_TZ3000_mmkbptmx', pid: 'TS0004', driverId: 'switch_4gang' },
      { mfr: '_TZ3000_ruxexjfz', pid: 'TS0002', driverId: 'switch_2gang' },
      { mfr: '_TZ3000_3dfewsk1', pid: 'TS0207', driverId: 'water_leak_sensor' },
      { mfr: '_TZ3000_wkai4ga5', pid: 'TS0042', driverId: 'button_wireless_2' },
      { mfr: '_TZE200_mja3fuja', pid: 'TS0601', driverId: 'air_quality_comprehensive' }
    ];

    for (const ep of expectedPins) {
      const found = couples.some(
        c => c.mfr.toLowerCase() === ep.mfr.toLowerCase() &&
             c.pid.toLowerCase() === ep.pid.toLowerCase() &&
             c.driverId === ep.driverId
      );
      assert.ok(found, `Couples must contain pin for ${ep.mfr}+${ep.pid} -> ${ep.driverId}`);
    }
  });

  it('driver-mapping-database.json does not map misattributed devices to air_purifier', () => {
    const p = path.join(__dirname, '../../data/driver-mapping-database.json');
    if (!fs.existsSync(p)) return;
    const dmd = JSON.parse(fs.readFileSync(p, 'utf8'));

    const checks = [
      ['_TZE200_mja3fuja', 'air_quality_comprehensive'],
      ['_TZE200_2ekuz3dz', 'wall_thermostat'],
      ['_TZE204_qasjif9e', 'presence_sensor_radar'],
      ['_TZE204_sxm7l9xa', 'presence_sensor_radar'],
      ['_TZE200_3p5ydos3', 'wall_dimmer_tuya'],
      ['_TZE200_3towulqd', 'presence_sensor_radar'],
      ['_TZE200_p0gzbqct', 'wall_dimmer_tuya'],
      ['_TZE200_dfxkcots', 'wall_dimmer_tuya']
    ];

    for (const [mfr, driver] of checks) {
      const mapped = dmd.mfr_index[mfr] || [];
      assert.ok(!mapped.includes('air_purifier'), `${mfr} must not map to air_purifier`);
      assert.ok(mapped.includes(driver), `${mfr} must map to ${driver}`);
    }
  });

});
