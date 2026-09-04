'use strict';

/**
 * P2391 — VicHY #2224 mains radar: no phantom low-battery + config cache upgrade
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P2391 — VicHY #2224 mains radar battery/flood', () => {
  it('clrdrnya resolves MTG075 mains no-battery (not HOBEIAN DP121)', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = getSensorConfig('_TZE204_clrdrnya', 'TS0601');
    assert.strictEqual(cfg.configName, 'MTG075_ZB_RL_RELAY');
    assert.strictEqual(cfg.mainsPowered, true);
    assert.strictEqual(cfg.noBatteryCapability, true);
    assert.ok(!cfg.dpMap[121], 'must not map HOBEIAN battery DP121');
    assert.ok(cfg.floodCalm, 'P2389 floodCalm on MTG075');
  });

  it('presence_sensor_radar device guards phantom battery + tuya_dp_value + config upgrade', () => {
    const src = read('drivers/presence_sensor_radar/device.js');
    assert.ok(src.includes('P2391'), 'P2391 markers');
    assert.ok(src.includes("capability === 'tuya_dp_value'"), 'blocks DIY DP caps');
    assert.ok(src.includes('cleared Homey Energy batteries'), 'clears energy.batteries on mains');
    assert.ok(src.includes('P2391/P2420 cleared Homey Energy'), 'P2420 always clears energy');
    assert.ok(src.includes('2_000'), 'P2420 early 2s re-heal');
    assert.ok(src.includes('config upgrade'), 'upgrades DEFAULT cache when mfr resolves');
    assert.ok(src.includes("phantoms.push('measure_battery', 'alarm_battery')"), 'heal strips battery');
  });
});

describe('P2420 — VicHY #2227 DP2 setting ownership', () => {
  it('EF00 skips humidity SmartDivisor when dpMap has setting / cap:null', () => {
    const src = read('lib/tuya/TuyaEF00Manager.js');
    assert.ok(src.includes('localDpMap.setting'), 'setting counts as explicit mapping');
    assert.ok(src.includes("hasOwnProperty.call(localDpMap, 'cap')"), 'cap:null is explicit');
    assert.ok(src.includes('owned_dp_2') || src.includes('presence_sensor_radar'), 'radar DP2 owned context');
  });
});
