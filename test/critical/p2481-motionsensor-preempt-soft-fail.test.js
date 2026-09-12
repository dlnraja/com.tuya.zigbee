'use strict';

/**
 * P2481 + P2482 — Preempt Homey class driver IDs; never preempt own drivers.
 * Contre quoi:
 * - Gmail crash 9.0.891/895 motionsensor / Invalid Driver ID
 * - P2482: pirsensor/siren/doorbell must still call Homey getDriver
 */

const assert = require('assert');
const path = require('path');
const {
  isForeignDriverId,
  installSafeGetDriver,
  getOwnDriverIds,
} = require(path.join(__dirname, '..', '..', 'lib', 'utils', 'safe-get-driver-patch.js'));

assert.equal(isForeignDriverId('motionsensor'), true);
assert.equal(isForeignDriverId('light'), true);
assert.equal(isForeignDriverId('ZG9101SAC_HP'), true);
assert.equal(isForeignDriverId('curtain_motor'), false);
assert.equal(isForeignDriverId('homey:virtualdriverzigbee:driver'), true);

// P2482: own drivers that share Homey class names must NOT be foreign
const own = getOwnDriverIds();
assert.ok(own.has('pirsensor') || own.has('siren') || own.has('doorbell'), 'own driver set loaded');
assert.equal(isForeignDriverId('pirsensor'), false, 'pirsensor is our driver');
assert.equal(isForeignDriverId('siren'), false, 'siren is our driver');
assert.equal(isForeignDriverId('doorbell'), false, 'doorbell is our driver');
assert.equal(isForeignDriverId('presence_sensor_radar'), false);

let called = 0;
const fake = {
  getDriver(id) { called += 1; return { id }; },
  _getDriverManifest(id) { called += 1; return { id }; },
};
assert.equal(installSafeGetDriver(fake, null, { force: true }), true);
assert.equal(fake.getDriver('motionsensor'), null);
assert.equal(fake._getDriverManifest('motionsensor'), null);
const before = called;
assert.ok(fake.getDriver('pirsensor'), 'pirsensor reaches orig');
assert.ok(called > before, 'P2482: own driver must call orig getDriver');

console.log('P2481/P2482 motionsensor preempt + own-driver carve-out: PASS');
