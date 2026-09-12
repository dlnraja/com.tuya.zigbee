'use strict';

/**
 * P2480 — Homey crash soft-fail for Driver Not Initialized: motionsensor
 * Contre quoi: Gmail crash 9.0.891/9.0.895 Homey Pro 2026 process kill.
 */

const assert = require('assert');
const path = require('path');
const { shouldSoftFail, installSafeGetDriver } = require(
  path.join(__dirname, '..', '..', 'lib', 'utils', 'safe-get-driver-patch.js'),
);

assert.equal(
  shouldSoftFail('motionsensor', new Error('Driver Not Initialized: motionsensor')),
  true,
  'P2480: Driver Not Initialized must soft-fail',
);
assert.equal(
  shouldSoftFail('motionsensor', new Error('Invalid Driver ID: motionsensor')),
  true,
  'P2480: Invalid Driver ID motionsensor must soft-fail',
);

const fake = {
  getDriver(id) { throw new Error(`Driver Not Initialized: ${id}`); },
  _getDriverManifest(id) { throw new Error(`Driver Not Initialized: ${id}`); },
};
assert.equal(installSafeGetDriver(fake, null, { force: true }), true);
assert.equal(fake.getDriver('motionsensor'), null);
assert.equal(fake._getDriverManifest('motionsensor'), null);

console.log('P2480 motionsensor Driver Not Initialized soft-fail: PASS');
