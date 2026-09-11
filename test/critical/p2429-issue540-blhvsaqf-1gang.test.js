'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2429 — Issue #540 BSEED 1-Gang Switch Module (_TZ3000_blhvsaqf / TS0001)', () => {
  // P2462: BSEED Identify+E000/E001 → wall_switch_1gang_1way (not metering switch_1gang)
  it('DeviceFingerprintDB routes _TZ3000_blhvsaqf + TS0001 to wall_switch_1gang_1way', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
    const entry = FINGERPRINT_DB['_TZ3000_blhvsaqf|TS0001'];
    assert.ok(entry, 'compound key _TZ3000_blhvsaqf|TS0001 must exist');
    assert.strictEqual(entry.driver, 'wall_switch_1gang_1way', 'driver must be wall_switch_1gang_1way');
    assert.strictEqual(entry.protocol, 'zcl', 'protocol must be zcl');
  });

  it('DeviceFingerprintDB handles case-insensitive variants for _TZ3000_blhvsaqf', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
    for (const key of [
      '_tz3000_blhvsaqf|TS0001',
      '_TZ3000_BLHVSAQF|TS0001',
      '_tz3000_blhvsaqf|ts0001',
      '_TZ3000_BLHVSAQF|ts0001'
    ]) {
      const entry = FINGERPRINT_DB[key];
      assert.ok(entry, `case variant ${key} must exist`);
      assert.strictEqual(entry.driver, 'wall_switch_1gang_1way', `case variant ${key} must route to wall`);
    }
  });

  it('publish-sacred-keep-couples.json locks _TZ3000_blhvsaqf + TS0001 to wall_switch_1gang_1way', () => {
    const p = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const couples = Array.isArray(data) ? data : (data.couples || []);
    const match = couples.find(
      (c) => c.mfr && c.mfr.toLowerCase() === '_tz3000_blhvsaqf' && c.pid && c.pid.toLowerCase() === 'ts0001'
    );
    assert.ok(match, 'couple must exist in sacred keep couples');
    assert.strictEqual(match.driverId, 'wall_switch_1gang_1way');
  });

  it('drivers/wall_switch_1gang_1way contains _TZ3000_blhvsaqf; switch_1gang does not', () => {
    const wall = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'wall_switch_1gang_1way', 'driver.compose.json'), 'utf8'));
    const s1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'));
    assert.ok(wall.zigbee.manufacturerName.some((m) => /blhvsaqf/i.test(m)), 'must include canonical mfr on wall');
    assert.ok(wall.zigbee.productId.includes('TS0001'), 'must include TS0001');
    assert.ok(!s1.zigbee.manufacturerName.some((m) => /blhvsaqf/i.test(m)), 'must leave metering switch_1gang');
  });

  it('drivers/switch_wall_7gang/driver.compose.json does NOT contain _TZ3000_blhvsaqf', () => {
    const p = path.join(ROOT, 'drivers', 'switch_wall_7gang', 'driver.compose.json');
    const compose = JSON.parse(fs.readFileSync(p, 'utf8'));
    const found = compose.zigbee.manufacturerName.some((m) => /blhvsaqf/i.test(m));
    assert.strictEqual(found, false, '7-gang driver must not contain 1-gang blhvsaqf');
  });

  it('data/driver-mapping-database.json maps _TZ3000_blhvsaqf to wall_switch_1gang_1way', () => {
    const p = path.join(ROOT, 'data', 'driver-mapping-database.json');
    const db = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(db.mfr_index['_TZ3000_blhvsaqf'], 'mfr_index must contain _TZ3000_blhvsaqf');
    assert.strictEqual(db.mfr_index['_TZ3000_blhvsaqf'][0], 'wall_switch_1gang_1way');
  });
});