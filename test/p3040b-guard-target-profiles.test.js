'use strict';

/**
 * Tests — P3040b: every driver CoupleGuard can name as the exact driver (couple-guard.json + verified
 * couple pins) and the 9 P3039b/c drivers have a profile in data/driver-mapping-database.json, so
 * IntelligentDriverHotSwap.applyDriverProfile can overlay it (additive) without a re-pair.
 * Each profile mirrors its driver.compose.json (same class, no capability the driver does not declare).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const DB = read('data/driver-mapping-database.json').drivers;
const GUARD = read('lib/data/couple-guard.json').drivers;
const PINS = read('config/architecture/couple-driver-pins.json').pins;
const P3039BC = ['gpo_double_light_mg_au03', 'gpo_double_mg_gpo02z', 'keypad_alarm_wke502z', 'wall_switch_rf_ews1154z',
  'thermostat_vrf_bvrf_l001', 'ufh_controller_pro_line_x10', 'ufh_controller_ch8z', 'energy_meter_3ch_bidirectional',
  'smoke_sensor_ts0601_dp'];
const NAMED = ['smoke_sensor_ts0601_dp', 'slim_motion_sensor', 'motion_sensor_excellux_zg104plv', 'co_sensor_dcr_co'];

// Profiles written by P3040b (mirrors of driver.compose.json). Older profiles are only checked for presence.
const PIN_TARGETS_P3040B = ['dimmer_1_gang', 'dimmer_1_gang_tuya', 'heiman_keyfob', 'heiman_siren', 'lcdtemphumidsensor_3',
  'panel_switch_cover_tuya', 'smart_knob_zg101zd', 'smartplug', 'smoke_sensor', 'smoke_sensor2', 'socket_power_strip',
  'switch_3_gang', 'temphumidsensor3', 'valve_novato_zpv01', 'wall_dimmer_tuya', 'wall_thermostat'];
const WRITTEN = new Set([...NAMED, ...P3039BC, ...PIN_TARGETS_P3040B]);

const targets = [...new Set([...Object.keys(GUARD), ...PINS.map((p) => p.driver), ...P3039BC, ...NAMED])]
  .filter((id) => fs.existsSync(path.join(ROOT, 'drivers', id, 'driver.compose.json')));

describe('P3040b — CoupleGuard targets have a driver profile', () => {
  it('the 4 named drivers and the 9 P3039b/c drivers are all covered', () => {
    for (const id of [...NAMED, ...P3039BC]) {assert.ok(targets.includes(id), id);}
  });
  for (const id of targets) {
    it(`${id}: profile present${WRITTEN.has(id) ? ' and consistent with driver.compose.json' : ''}`, () => {
      const prof = DB[id];
      assert.ok(prof && Array.isArray(prof.capabilities) && prof.capabilities.length, `missing profile ${id}`);
      if (!WRITTEN.has(id)) {return;}
      const compose = read(`drivers/${id}/driver.compose.json`);
      assert.strictEqual(prof.class, compose.class, `${id} class`);
      const declared = new Set(compose.capabilities || []);
      for (const cap of prof.capabilities) {assert.ok(declared.has(cap), `${id}: ${cap} not declared by the driver`);}
    });
  }
});
