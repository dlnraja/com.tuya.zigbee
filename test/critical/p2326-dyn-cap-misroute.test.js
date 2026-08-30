'use strict';
const { describe, it } = require('node:test');
const assert = require('assert');
const path = require('path');

describe('P2326 dyn-cap skip driver-owned DPs', () => {
  it('skips DP36 when FCU dpMappings reserve valve', () => {
    const DCM = require('../../lib/dynamic/DynamicCapabilityManager');
    const device = {
      log() {},
      error() {},
      homey: {},
      dpMappings: { 36: { internal: true, type: 'valve' }, 16: { capability: 'target_temperature' } },
      _dynCapBlockDps: new Set([36, 16]),
      hasCapability: () => true,
      getSetting: () => '_TZE204_mpbki2zm',
      getStoreValue: async () => ({}),
      setStoreValue: async () => {},
      driver: { id: 'wall_thermostat' },
    };
    const mgr = new DCM(device);
    assert.strictEqual(mgr._isDriverOwnedDp(36), true);
    assert.strictEqual(mgr._isDriverOwnedDp(16), true);
    assert.strictEqual(mgr._isDriverOwnedDp(99), false);
  });

  it('radiator device.js calls ensureManufacturerSettings / MISROUTE', () => {
    const src = require('fs').readFileSync(
      path.join(__dirname, '../../drivers/device_radiator_valve/device.js'),
      'utf8',
    );
    assert.match(src, /MISROUTE-P2326/);
    assert.match(src, /ensureManufacturerSettings/);
  });
});
