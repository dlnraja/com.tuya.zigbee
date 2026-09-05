'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2244 — meter91 scene_switch_4 + Nobø button_wireless_4 sacred couple gate
 * Never invent TS0601 for zgyzgdua; never route TS0044 → button_wireless_4.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadMfs() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
}

describe('P2244 scene/remote sacred couples', () => {
  it('meter91 _TZ3000_zgyzgdua+TS0044 → scene_switch_4 (not button_wireless_4)', () => {
    const j = loadMfs();
    const sc = j.sacredCouples || {};
    const couple = sc['_tz3000_zgyzgdua|ts0044'];
    assert.ok(couple, 'sacred couple missing');
    assert.strictEqual(couple.driver, 'scene_switch_4');
    assert.strictEqual(sc['_tz3000_zgyzgdua|ts0601'], undefined, 'must not invent TS0601');
    assert.strictEqual((j['_tz3000_zgyzgdua'] || j['_TZ3000_zgyzgdua'])?.driverId, 'scene_switch_4');

    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers', 'scene_switch_4', 'driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.includes('_tz3000_zgyzgdua'));

    const bw4 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers', 'button_wireless_4', 'driver.compose.json'), 'utf8'));
    const bw4m = (bw4.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.strictEqual(bw4m.includes('_tz3000_zgyzgdua'), false);
  });

  it('Nobø _TZ3000_xffhmvhv+TS004F → button_wireless_4 + skip 0x8004 family', () => {
    const j = loadMfs();
    const sc = j.sacredCouples || {};
    const couple = sc['_tz3000_xffhmvhv|ts004f'];
    assert.ok(couple, 'Nobø sacred couple missing');
    assert.strictEqual(couple.driver, 'button_wireless_4');

    const { classifyOperatingFamily } = require('../../lib/zigbee/DeviceOperatingMode');
    const family = classifyOperatingFamily({
      driver: { id: 'button_wireless_4' },
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_xffhmvhv'
        : k === 'zb_model_id' ? 'TS004F' : null),
      getData: () => ({ manufacturerName: '_TZ3000_xffhmvhv', productId: 'TS004F' }),
    });
    assert.strictEqual(family.writeSceneAttr, false);
    assert.strictEqual(family.family, 'ts0044');

    const db = require('../../lib/DeviceFingerprintDB');
    const hit = db.lookup('_TZ3000_xffhmvhv', 'TS004F');
    assert.strictEqual(hit?.driver, 'button_wireless_4');
  });

  it('DeviceFingerprintDB keeps zgyzgdua|TS0044 on scene_switch_4', () => {
    const db = require('../../lib/DeviceFingerprintDB');
    const hit = db.lookup('_TZ3000_zgyzgdua', 'TS0044');
    assert.strictEqual(hit?.driver, 'scene_switch_4');
  });
});
