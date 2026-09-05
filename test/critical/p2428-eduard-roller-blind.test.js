'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');
const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
const { isBatteryCoverMfr } = require(path.join(ROOT, 'lib', 'helpers', 'batteryPowerSource'));

describe('P2428 Eduard_Martirosyan #2228 DC tubular roller blind motor (_TZE284_fodv6bkr)', () => {
  it('DeviceFingerprintDB resolves exact and caseless to curtain_motor', () => {
    const exact = DeviceFingerprintDB.lookup('_TZE284_fodv6bkr', 'TS0601');
    assert.ok(exact, 'must resolve exact');
    assert.strictEqual(exact.driver, 'curtain_motor');
    assert.strictEqual(exact.powerSource, 'battery');

    const lower = DeviceFingerprintDB.lookup('_tze284_fodv6bkr', 'ts0601');
    assert.ok(lower, 'must resolve lower case');
    assert.strictEqual(lower.driver, 'curtain_motor');

    const upper = DeviceFingerprintDB.lookup('_TZE284_FODV6BKR', 'TS0601');
    assert.ok(upper, 'must resolve upper case');
    assert.strictEqual(upper.driver, 'curtain_motor');
  });

  it('DeviceFingerprintDB returns correct DP meanings for cover DPs', () => {
    const dp1 = DeviceFingerprintDB.getDPMeaning('_TZE284_fodv6bkr', 'TS0601', 1);
    assert.ok(dp1, 'DP1 must exist');
    assert.strictEqual(dp1.capability, 'windowcoverings_state');

    const dp2 = DeviceFingerprintDB.getDPMeaning('_TZE284_fodv6bkr', 'TS0601', 2);
    assert.ok(dp2, 'DP2 must exist');
    assert.strictEqual(dp2.capability, 'windowcoverings_set');

    const dp3 = DeviceFingerprintDB.getDPMeaning('_TZE284_fodv6bkr', 'TS0601', 3);
    assert.ok(dp3, 'DP3 must exist');
    assert.strictEqual(dp3.capability, 'windowcoverings_set');

    const dp13 = DeviceFingerprintDB.getDPMeaning('_TZE284_fodv6bkr', 'TS0601', 13);
    assert.ok(dp13, 'DP13 must exist');
    assert.strictEqual(dp13.capability, 'measure_battery');
  });

  it('isBatteryCoverMfr recognizes _TZE284_fodv6bkr and _TZE284_libht6ua as battery devices', () => {
    assert.strictEqual(isBatteryCoverMfr('_TZE284_fodv6bkr'), true);
    assert.strictEqual(isBatteryCoverMfr('_tze284_fodv6bkr'), true);
    assert.strictEqual(isBatteryCoverMfr('_TZE284_FODV6BKR'), true);
    assert.strictEqual(isBatteryCoverMfr('_TZE284_libht6ua'), true);
    assert.strictEqual(isBatteryCoverMfr('_tze284_libht6ua'), true);
    assert.strictEqual(isBatteryCoverMfr('_TZE284_LIBHT6UA'), true);
  });

  it('curtain_motor compose claims _TZE284_fodv6bkr and TS0601', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', 'curtain_motor', 'driver.compose.json'), 'utf8')
    );
    const mfrs = (compose.zigbee?.manufacturerName || []).map(m => m.toLowerCase());
    const pids = (compose.zigbee?.productId || []).map(p => String(p).toUpperCase());
    assert.ok(mfrs.includes('_tze284_fodv6bkr'));
    assert.ok(pids.includes('TS0601'));
  });

  it('sacred-keep pins _TZE284_fodv6bkr to prevent publish compaction drops', () => {
    const sacred = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json'), 'utf8')
    );
    const found = (sacred.couples || []).find(
      c => c.mfr.toLowerCase() === '_tze284_fodv6bkr' && c.pid.toUpperCase() === 'TS0601' && c.driverId === 'curtain_motor'
    );
    assert.ok(found, 'must be pinned in publish-sacred-keep-couples.json');
  });

  it('user-misattribution-registry locks _TZE284_fodv6bkr away from wrong drivers', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data', 'user-misattribution-registry.json'), 'utf8')
    );
    const found = (reg.cases || []).find(
      c => c.id === 'eduard-martirosyan-tze284-fodv6bkr-curtain'
    );
    assert.ok(found, 'must have case in user-misattribution-registry.json');
    assert.strictEqual(found.canonicalDriver, 'curtain_motor');
    assert.ok(found.forbiddenDrivers.includes('climate_sensor'));
    assert.ok(found.forbiddenDrivers.includes('switch_1gang'));
  });

  it('driver-mapping-database index routes _TZE284_fodv6bkr to curtain_motor', () => {
    const p1 = path.join(ROOT, 'data', 'driver-mapping-database.json');
    const p2 = path.join(ROOT, 'driver-mapping-database.json');
    const file = fs.existsSync(p1) ? p1 : p2;
    const db = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(db.mfr_index['_TZE284_fodv6bkr'] || db.mfr_index['_tze284_fodv6bkr']);
  });
});
