'use strict';

/**
 * P2351 — Soft-fail foreign ManagerDrivers IDs (Hue ZG9101SAC_HP)
 * Crash: Gmail 9.0.730 / 9.0.743 HomeySerializer → getDriver → _getDriverManifest
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');
const {
  shouldSoftFail,
  installSafeGetDriver,
} = require(path.join(ROOT, 'lib/utils/safe-get-driver-patch.js'));

describe('P2351 safe-get-driver soft-fail', () => {
  it('soft-fails Hue ZG9101SAC_HP and Invalid Driver ID', () => {
    assert.equal(shouldSoftFail('ZG9101SAC_HP', new Error('Invalid Driver ID: ZG9101SAC_HP')), true);
    assert.equal(shouldSoftFail('homey:virtualdriverzigbee:driver', new Error('Invalid Driver ID')), true);
    assert.equal(shouldSoftFail('LCT001', new Error('Invalid Driver ID: LCT001')), true);
    assert.equal(shouldSoftFail('switch_1gang', new Error('something else')), false);
  });

  it('wraps getDriver and _getDriverManifest to return null', () => {
    const fake = {
      getDriver(id) {
        throw new Error(`Invalid Driver ID: ${id}`);
      },
      _getDriverManifest(id) {
        throw new Error(`Invalid Driver ID: ${id}`);
      },
    };
    assert.equal(installSafeGetDriver(fake), true);
    assert.equal(fake.getDriver('ZG9101SAC_HP'), null);
    assert.equal(fake._getDriverManifest('ZG9101SAC_HP'), null);
    assert.equal(fake.__p2351SafeGetDriver, true);
  });

  it('app.js loads safe-get-driver-patch early', () => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.match(appJs, /safe-get-driver-patch/);
    assert.match(appJs, /P2351/);
  });

  it('p2347 Cartesian registry case no longer forces multi-gang mfs', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const bad = (reg.cases || []).find((c) => c.id === 'p2347-gabriel-zemismart-verified-only');
    assert.equal(bad, undefined, 'old cartesian case must be gone');
    const doc = (reg.cases || []).find((c) => c.id === 'p2347-gabriel-zemismart-cartesian-doc-only');
    assert.ok(doc);
    assert.equal(doc.enrichOnly, true);
    assert.deepEqual(doc.mfr || [], []);
  });
});
