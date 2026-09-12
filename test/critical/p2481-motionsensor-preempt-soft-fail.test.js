'use strict';

/**
 * P2481 — Preempt Homey class driver IDs (never call Homey getDriver).
 * Contre quoi: Gmail crash 9.0.891 still threw inside safeGetDriver catch-path;
 * 9.0.895 Invalid Driver ID via _getDriverManifest without preempt.
 */

const assert = require('assert');
const path = require('path');
const {
  isForeignDriverId,
  installSafeGetDriver,
} = require(path.join(__dirname, '..', '..', 'lib', 'utils', 'safe-get-driver-patch.js'));

assert.equal(isForeignDriverId('motionsensor'), true);
assert.equal(isForeignDriverId('light'), true);
assert.equal(isForeignDriverId('ZG9101SAC_HP'), true);
assert.equal(isForeignDriverId('curtain_motor'), false);

let called = 0;
const fake = {
  getDriver() { called += 1; throw new Error('should not reach'); },
  _getDriverManifest() { called += 1; throw new Error('should not reach'); },
};
assert.equal(installSafeGetDriver(fake, null, { force: true }), true);
assert.equal(fake.getDriver('motionsensor'), null);
assert.equal(fake._getDriverManifest('motionsensor'), null);
assert.equal(called, 0, 'P2481: preempt must not call orig Homey getDriver');

console.log('P2481 motionsensor preempt soft-fail: PASS');
