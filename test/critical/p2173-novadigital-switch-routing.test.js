'use strict';

/**
 * P2173 — NovaDigital/Zemismart multi-gang sacred couples must not live
 * on climate_sensor or the wrong gang driver.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { isForbiddenPlacement, lookup } = require('../../lib/pairing/UserMisattributionRegistry');

function composeMfrs(driver) {
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return new Set((json.zigbee.manufacturerName || []).map((x) => String(x).toLowerCase()));
}

function hasMfr(driver, mfr) {
  return composeMfrs(driver).has(String(mfr).toLowerCase());
}

describe('P2173 NovaDigital/Zemismart switch routing', () => {
  it('routes 2-gang jjdkhueq onto wall_switch_2gang_1way (sub-device tiles)', () => {
    assert.strictEqual(hasMfr('wall_switch_2gang_1way', '_TZ3000_jjdkhueq'), true);
    assert.strictEqual(hasMfr('switch_2gang', '_TZ3000_jjdkhueq'), false);
    assert.strictEqual(hasMfr('switch_1gang', '_TZ3000_jjdkhueq'), false);
    assert.strictEqual(isForbiddenPlacement('_TZ3000_jjdkhueq', 'climate_sensor'), true);
    assert.strictEqual(isForbiddenPlacement('_TZ3000_jjdkhueq', 'switch_2gang'), true);
    assert.strictEqual(lookup('_TZ3000_jjdkhueq', 'TS0002').canonicalDriver, 'wall_switch_2gang_1way');
  });

  it('moves ok0ggpk7 / f09j9qjb / vjhcenzo onto switch_3gang', () => {
    for (const mfr of ['_TZ3000_ok0ggpk7', '_TZ3000_f09j9qjb', '_TZ3000_vjhcenzo']) {
      assert.strictEqual(hasMfr('switch_3gang', mfr), true, `${mfr} missing on switch_3gang`);
      assert.strictEqual(hasMfr('climate_sensor', mfr), false, `${mfr} still on climate`);
    }
    assert.strictEqual(hasMfr('switch_1gang', '_TZ3000_ok0ggpk7'), false);
    assert.strictEqual(hasMfr('switch_2_gang', '_TZ3000_f09j9qjb'), false);
    assert.strictEqual(isForbiddenPlacement('_TZ3000_ok0ggpk7', 'switch_1gang'), true);
  });

  it('routes 4-gang MCU couples onto wall_switch_4_gang_tuya', () => {
    for (const mfr of ['_TZE200_shkxsgis', '_TZE284_shkxsgis', '_TZE204_aagrxlbd']) {
      assert.strictEqual(hasMfr('wall_switch_4_gang_tuya', mfr), true, `${mfr} missing on 4-gang tuya`);
      assert.strictEqual(hasMfr('climate_sensor', mfr), false, `${mfr} still on climate`);
      assert.strictEqual(hasMfr('switch_4gang', mfr), false, `${mfr} leaked onto ZCL 4-gang`);
    }
    assert.strictEqual(hasMfr('din_rail_meter', '_TZE204_shkxsgis'), false);
    assert.strictEqual(lookup('_TZE204_aagrxlbd', 'TS0601').canonicalDriver, 'wall_switch_4_gang_tuya');
  });

  it('routes 6-gang MCU couples onto wall_switch_6_gang_tuya', () => {
    for (const mfr of ['_TZE200_r731zlxk', '_TZE284_r731zlxk']) {
      assert.strictEqual(hasMfr('wall_switch_6_gang_tuya', mfr), true, `${mfr} missing on 6-gang tuya`);
      assert.strictEqual(hasMfr('climate_sensor', mfr), false, `${mfr} still on climate`);
      assert.strictEqual(hasMfr('switch_wall_6gang', mfr), false, `${mfr} leaked onto ZCL 6-gang`);
    }
    assert.strictEqual(isForbiddenPlacement('_TZE284_r731zlxk', 'climate_sensor'), true);
  });

  it('keeps TZ3210_ok0ggpk7 on 1-gang (different silicon, unconfirmed 3-gang)', () => {
    assert.strictEqual(hasMfr('switch_1gang', '_TZ3210_ok0ggpk7'), true);
  });

  it('routes TS011F strip cfnprab5 off the 2-button remote', () => {
    assert.strictEqual(hasMfr('socket_power_strip_four_three', '_TZ3000_cfnprab5'), true);
    assert.strictEqual(hasMfr('button_wireless_2', '_TZ3000_cfnprab5'), false);
    assert.strictEqual(lookup('_TZ3000_cfnprab5', 'TS011F').canonicalDriver, 'socket_power_strip_four_three');
  });

  it('routes ZCL 4-gang lwthnp7j onto switch_4gang', () => {
    assert.strictEqual(hasMfr('switch_4gang', '_TZ3000_lwthnp7j'), true);
    assert.strictEqual(lookup('_TZ3000_lwthnp7j', 'TS0004').canonicalDriver, 'switch_4gang');
  });

  it('routes TS011F okaz9tjs / fgwhjm9j onto the metering plug', () => {
    assert.strictEqual(hasMfr('plug_energy_monitor', '_TZ3000_okaz9tjs'), true);
    assert.strictEqual(hasMfr('button_wireless_plug', '_TZ3000_okaz9tjs'), false);
    assert.strictEqual(hasMfr('plug_energy_monitor', '_TZ3210_fgwhjm9j'), true);
    assert.strictEqual(hasMfr('climate_sensor', '_TZ3210_fgwhjm9j'), false);
    assert.strictEqual(lookup('_TZ3000_okaz9tjs', 'TS011F').canonicalDriver, 'plug_energy_monitor');
    assert.strictEqual(lookup('_TZ3210_fgwhjm9j', 'TS011F').canonicalDriver, 'plug_energy_monitor');
  });
});
