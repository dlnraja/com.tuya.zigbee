'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2259 — HOBEIAN ZG-223Z rain sensor vs water_leak_sensor collision
 * Z2M: ZG-223Z = Rainwater detection sensor (CR123A), not IAS water leak.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(driverId) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
}

describe('P2259 ZG-223Z rain couple gate', function () {
  this.timeout?.(30000);

  it('rain_sensor owns ZG-223Z + HOBEIAN; water_leak drivers must not claim ZG-223Z', () => {
    const rain = loadCompose('rain_sensor');
    const leak = loadCompose('water_leak_sensor');
    const leakTuya = loadCompose('water_leak_sensor_tuya');

    assert.ok(includesCI(rain.zigbee.productId, 'ZG-223Z'));
    assert.ok(includesCI(rain.zigbee.manufacturerName, 'HOBEIAN'));
    assert.ok(!includesCI(leak.zigbee.productId, 'ZG-223Z'), 'water_leak_sensor must not list ZG-223Z');
    assert.ok(!includesCI(leakTuya.zigbee.productId, 'ZG-223Z'), 'water_leak_sensor_tuya must not list ZG-223Z');
  });

  it('rain_sensor energy includes CR123A (ZG-223Z battery)', () => {
    const rain = loadCompose('rain_sensor');
    const bats = rain.energy?.batteries || [];
    assert.ok(includesCI(bats, 'CR123A'));
  });

  it('DeviceFingerprintDB locks HOBEIAN|ZG-223Z → rain_sensor', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'), 'utf8');
    assert.ok(src.includes("'HOBEIAN|ZG-223Z'"));
    assert.ok(src.includes("driver: 'rain_sensor'"));
  });

  it('registry p2259-hobeian-zg223z-rain forbids water_leak drivers', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'user-misattribution-registry.json'), 'utf8'));
    const hit = (reg.cases || []).find((c) => c.id === 'p2259-hobeian-zg223z-rain');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'rain_sensor');
    assert.ok((hit.forbiddenDrivers || []).includes('water_leak_sensor'));
    assert.strictEqual(String(hit.forbidMode || '').toLowerCase(), 'couple');
  });

  it('mfs_db HOBEIAN byPid maps ZG-223Z to rain_sensor', () => {
    const mfs = fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8');
    assert.ok(/"ZG-223Z"\s*:\s*"rain_sensor"/.test(mfs), 'HOBEIAN byPid must route ZG-223Z to rain_sensor');
    assert.ok(!/"ZG-223Z"\s*:\s*"water_leak_sensor"/.test(mfs), 'must not route ZG-223Z to water_leak_sensor');
  });
});
