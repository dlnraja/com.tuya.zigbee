'use strict';
// WHY(P3220): ZG-204ZX _TZE200_w0ap83qu reports DP111 in the unit chosen on DP109 (zhc hobeian.ts:
// temperature_unit 0 celsius / 1 fahrenheit). Homey measure_temperature is °C, so convert when DP109 = F.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
describe('P3220 ZG-204ZX °F -> °C', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
  const fn = new Function(`${src.match(/function radarTempToCelsius[\s\S]*?\n}\n/)[0]}; return radarTempToCelsius;`)();
  it('converts only when the unit is fahrenheit', () => {
    assert.equal(fn(68, 1), 20);
    assert.equal(fn(68, 'fahrenheit'), 20);
    assert.equal(fn(21.5, 0), 21.5);
    assert.equal(fn(21.5, undefined), 21.5);
  });
  it('ZG-204ZX profile maps DP109 temperature_unit and the device paints DP111 through it', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    const zx = cfg.slice(cfg.indexOf("'HOBEIAN_ZG204ZX': {"), cfg.indexOf('DEFAULT fallback'));
    assert.match(zx, /109: \{ cap: null, setting: 'temperature_unit' \}/);
    assert.match(src, /radarTempToCelsius\(v, this\.getStoreValue\?\.\('radar_temperature_unit'\)\)/);
  });
});
