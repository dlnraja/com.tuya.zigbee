'use strict';

/**
 * P2260 — forum NOT_IN_CATALOG couples + P2258 anti-bot collision cleanup
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2260 forum catalog gate', function () {
  this.timeout(30000);

  it('Linptech ewrxirng removed from presence_sensor_radar (P2258 anti-bot)', () => {
    const pr = loadCompose('presence_sensor_radar');
    const mfr = pr.zigbee.manufacturerName || [];
    assert.ok(!includesCI(mfr, '_TZ3218_ewrxirng'));
    const mm = loadCompose('motion_sensor_radar_mmwave');
    assert.ok(includesCI(mm.zigbee.manufacturerName, '_TZ3218_ewrxirng'));
  });

  it('upgcbody+TS0207 locked to water_leak_sensor IAS', () => {
    const wl = loadCompose('water_leak_sensor');
    assert.ok(includesCI(wl.zigbee.manufacturerName, '_TZ3000_upgcbody'));
    assert.ok(includesCI(wl.zigbee.productId, 'TS0207'));
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'), 'utf8');
    assert.ok(src.includes("'_TZ3000_upgcbody|TS0207'"));
  });

  it('3lbtuxgp+TS0505B locked to bulb_rgb not wall_dimmer_tuya', () => {
    const bulb = loadCompose('bulb_rgb');
    assert.ok(includesCI(bulb.zigbee.manufacturerName, '_TZ3210_3lbtuxgp'));
    assert.ok(includesCI(bulb.zigbee.productId, 'TS0505B'));
    const dim = loadCompose('wall_dimmer_tuya');
    assert.ok(!includesCI(dim.zigbee.manufacturerName, '_TZ3210_3lbtuxgp'));
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'), 'utf8');
    assert.ok(src.includes("'_TZ3210_3lbtuxgp|TS0505B'"));
  });
});
