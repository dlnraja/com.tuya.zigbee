'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P203 diag email deep fixes', () => {
  it('TuyaZigbeeDevice warns on misattributed drivers', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert(src.includes('_warnIfMisattributedDriver'));
    assert(src.includes('UserMisattributionRegistry'));
    assert(src.includes('isForbiddenDriver'));
  });

  it('IAS retry aborts on sleepy/offline device', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert(src.includes('Aborting — device offline/sleepy'));
    assert(src.includes('reageert niet'));
    assert(src.includes('sleepyMisses'));
  });

  it('TuyaEF00Manager DP timers use safe-timers and clear them', () => {
    const src = read('lib/tuya/TuyaEF00Manager.js');
    assert(src.includes("require('../utils/safe-timers')"));
    assert(src.includes('safeSetTimeout(this.device'));
    assert(src.includes('safeClearTimeout(this.device'));
    assert(!/this\._dpRequestTimer = this\.device\.homey\.setTimeout/.test(src));
  });

  it('m1cvyneb remains locked to wall_dimmer_tuya', () => {
    const reg = read('data/user-misattribution-registry.json');
    assert(reg.includes('_TZE284_m1cvyneb'));
    assert(reg.includes('"canonicalDriver": "wall_dimmer_tuya"'));
    assert(reg.includes('climate_sensor'));
    assert(reg.includes('soil_sensor'));
    assert(reg.includes('zigbee_universal'));
    const compose = read('drivers/wall_dimmer_tuya/driver.compose.json');
    assert(compose.includes('_TZE284_m1cvyneb'));
    assert(!fs.existsSync(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'))
      || !read('drivers/climate_sensor/driver.compose.json').includes('m1cvyneb'));
    const { getDriverId } = require('../../lib/tuya/DeviceFingerprintDB');
    assert.strictEqual(getDriverId('_TZE284_m1cvyneb', 'TS0601'), 'wall_dimmer_tuya');
  });
});
