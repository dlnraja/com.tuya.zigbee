'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2429 — Issue #540 BSEED 1-Gang Switch Module (_TZ3000_blhvsaqf / TS0001)', () => {
  it('DeviceFingerprintDB routes _TZ3000_blhvsaqf + TS0001 to switch_1gang', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
    const entry = FINGERPRINT_DB['_TZ3000_blhvsaqf|TS0001'];
    assert.ok(entry, 'compound key _TZ3000_blhvsaqf|TS0001 must exist');
    assert.strictEqual(entry.driver, 'switch_1gang', 'driver must be switch_1gang');
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
      assert.strictEqual(entry.driver, 'switch_1gang', `case variant ${key} must route to switch_1gang`);
    }
  });

  it('publish-sacred-keep-couples.json locks _TZ3000_blhvsaqf + TS0001 to switch_1gang', () => {
    const p = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const couples = Array.isArray(data) ? data : (data.couples || []);
    const match = couples.find(
      (c) => c.mfr && c.mfr.toLowerCase() === '_tz3000_blhvsaqf' && c.pid && c.pid.toLowerCase() === 'ts0001'
    );
    assert.ok(match, 'couple must exist in sacred keep couples');
    assert.strictEqual(match.driverId, 'switch_1gang');
  });

  it('drivers/switch_1gang/driver.compose.json contains _TZ3000_blhvsaqf and TS0001', () => {
    const p = path.join(ROOT, 'drivers', 'switch_1gang', 'driver.compose.json');
    const compose = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(compose.zigbee.manufacturerName.includes('_TZ3000_blhvsaqf'), 'must include canonical mfr');
    assert.ok(compose.zigbee.productId.includes('TS0001'), 'must include TS0001');
  });

  it('drivers/switch_wall_7gang/driver.compose.json does NOT contain _TZ3000_blhvsaqf', () => {
    const p = path.join(ROOT, 'drivers', 'switch_wall_7gang', 'driver.compose.json');
    const compose = JSON.parse(fs.readFileSync(p, 'utf8'));
    const found = compose.zigbee.manufacturerName.some((m) => /blhvsaqf/i.test(m));
    assert.strictEqual(found, false, '7-gang driver must not contain 1-gang blhvsaqf');
  });

  it('data/driver-mapping-database.json maps _TZ3000_blhvsaqf to switch_1gang', () => {
    const p = path.join(ROOT, 'data', 'driver-mapping-database.json');
    if (!fs.existsSync(p)) return;
    const db = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(db.mfr_index['_TZ3000_blhvsaqf'], 'mfr_index must contain _TZ3000_blhvsaqf');
    assert.strictEqual(db.mfr_index['_TZ3000_blhvsaqf'][0], 'switch_1gang');
  });
});
