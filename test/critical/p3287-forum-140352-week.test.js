'use strict';
/**
 * Forum 140352 requests from the week of 12–13 Nov 2026.
 * Sources: post 2270 diagnostic (FrankEver DP102 0/100), Z2M tuya.ts TZ-ZT01_GA4,
 * Z2M neo.ts NAS-WV03B2, post 2264 TS0046. No invented product ids.
 */
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tuyaDpBool } = require('../../lib/tuya/tuyaDpBool');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function owners(needle) {
  const want = needle.toLowerCase();
  const hits = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const file = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(file)) {
      continue;
    }
    if (fs.readFileSync(file, 'utf8').toLowerCase().includes(want)) {
      hits.push(id);
    }
  }
  return hits;
}

describe('P3287 forum 140352 week couples', () => {
  it('a one-byte open report is true and an unknown value is not stored as false', () => {
    assert.strictEqual(tuyaDpBool(Buffer.from([1])), true);
    assert.strictEqual(tuyaDpBool('true'), true);
    assert.strictEqual(tuyaDpBool(Buffer.from([0])), false);
    assert.strictEqual(tuyaDpBool('later'), null);
  });

  it('FrankEver _TZE200_1n2zev06 reads position without an open/close command', () => {
    assert.deepStrictEqual(owners('_tze200_1n2zev06'), ['water_valve_smart']);
    const src = fs.readFileSync(path.join(ROOT, 'drivers/water_valve_smart/device.js'), 'utf8');
    assert.match(src, /102:\s*\{[^}]*capability:\s*'valve_position'/);
    assert.match(src, /requestAllDPs\(\{\s*readOnly:\s*true\s*\}\)/);
    assert.match(src, /9:\s*\{[^}]*capability:\s*null/);
    assert.match(src, /101:\s*\{[^}]*capability:\s*null/);
    const mgr = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.match(mgr, /options\.readOnly/);
    assert.match(mgr, /DP1 not requested/);
    const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/zigbee/data/unknown-dp-catalog.json'), 'utf8'));
    assert.deepStrictEqual(cat.caps['_tze200_1n2zev06|TS0601'], { onoff: 1, valve_position: 102 });
  });

  it('LCD _TZE284_9ern5sfh stays on the LCD driver and the typo is absent', () => {
    assert.deepStrictEqual(owners('_tze284_9ern5sfh'), ['lcdtemphumidsensor_3']);
    assert.deepStrictEqual(owners('_tze284_9em5sfh'), []);
    const lcd = compose('lcdtemphumidsensor_3');
    assert.deepStrictEqual(lcd.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);
    assert.ok(lcd.capabilities.includes('measure_temperature'));
    assert.ok(lcd.capabilities.includes('measure_humidity'));
  });

  it('the 6-button couple is only on button_wireless_6 and is sacred', () => {
    assert.deepStrictEqual(owners('_tz3000_nrfkrgf4'), ['button_wireless_6']);
    assert.ok(compose('button_wireless_6').zigbee.productId.includes('TS0046'));
    const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8')).couples;
    assert.ok(pins.some((c) => c.mfr === '_TZ3000_nrfkrgf4' && c.pid === 'TS0046' && c.driverId === 'button_wireless_6'));
  });

  it('the long TZ-ZT01_GA4 name stays on climate_sensor with probe DP38', () => {
    const names = compose('climate_sensor').zigbee.manufacturerName;
    assert.ok(names.includes('_TZE2841000000_8se38w3c'));
    const src = fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/device.js'), 'utf8');
    assert.match(src, /8se38w3c/);
    assert.match(src, /38:\s*\{[^}]*measure_temperature\.probe/);
    const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8')).couples;
    assert.ok(pins.some((c) => c.mfr === '_TZE2841000000_8se38w3c' && c.pid === 'TS0601' && c.driverId === 'climate_sensor'));
  });

  it('NEO _TZE284_z7a2jmyy is a water valve, not a climate sensor', () => {
    assert.deepStrictEqual(owners('_tze284_z7a2jmyy'), ['water_valve_smart']);
    assert.deepStrictEqual(owners('_tze204_z7a2jmyy'), ['water_valve_smart']);
    const src = fs.readFileSync(path.join(ROOT, 'drivers/water_valve_smart/device.js'), 'utf8');
    assert.match(src, /NEO_SPRINKLER_MFRS/);
    assert.match(src, /isNeoSprinkler/);
    const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8')).couples;
    assert.ok(pins.some((c) => c.mfr === '_TZE284_z7a2jmyy' && c.pid === 'TS0601' && c.driverId === 'water_valve_smart'));
  });
});
