'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const { isZhtS01Couple } = require('../lib/thermostats/ZhtS01Map');

function loadCompose(id) {
  const p = path.join(__dirname, '..', 'drivers', id, 'driver.compose.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function hasMfr(compose, name) {
  const list = (compose.zigbee || {}).manufacturerName || [];
  return list.some((m) => String(m).toLowerCase() === String(name).toLowerCase());
}

describe('P3384 ZHT-S01 fingerprint move (Z2M moes.ts)', () => {
  it('is recognised as the official couple only', () => {
    assert.strictEqual(isZhtS01Couple('_TZE284_rlytpmij', 'TS0601'), true);
    assert.strictEqual(isZhtS01Couple('_TZE204_e5m9c5hl', 'TS0601'), false);
  });

  it('lists the official couple on wall_thermostat and not on presence_sensor_radar', () => {
    const wall = loadCompose('wall_thermostat');
    const radar = loadCompose('presence_sensor_radar');
    assert.ok(hasMfr(wall, '_TZE284_rlytpmij'));
    assert.ok(hasMfr(wall, '_tze284_rlytpmij'));
    assert.ok(!hasMfr(radar, '_TZE284_rlytpmij'));
    assert.ok(!hasMfr(radar, '_tze284_rlytpmij'));
  });

  it('Bastien house fleet does not add wall_thermostat (observed 27-driver ceiling)', () => {
    const ssot = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'architecture', 'bastien-publish-fleet-ssot.json'), 'utf8'));
    assert.ok(ssot.keepDriverIds.includes('presence_sensor_radar'));
    assert.ok(!ssot.keepDriverIds.includes('wall_thermostat'));
  });

  it('onMapDeviceClass wall_thermostat require is try-guarded (P3310 / preflight)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'drivers', 'presence_sensor_radar', 'driver.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    const needle = "require('../wall_thermostat/device')";
    const idx = src.indexOf(needle);
    assert.ok(idx >= 0, 'missing wall_thermostat require');
    const { tryGuarded } = require('../.github/scripts/pre-upload-completeness-guard');
    assert.strictEqual(tryGuarded(src, idx), true);
  });
});
