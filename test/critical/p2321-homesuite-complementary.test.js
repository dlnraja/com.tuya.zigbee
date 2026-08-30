'use strict';

/**
 * P2321 — Availability teardown race + quiet-mains candidate (HomeSuite ideas)
 */
const assert = require('assert');
const DeviceAvailabilityManager = require('../../lib/managers/DeviceAvailabilityManager');

describe('P2321 HomeSuite complementary reliability', () => {
  it('destroy() is idempotent and sync-guards unregister', () => {
    const mgr = new DeviceAvailabilityManager({ setInterval: () => 1, clearInterval: () => {} });
    const fake = {
      id: 'dev-a',
      getData: () => ({ id: 'dev-a' }),
      getName: () => 'A',
      getCapabilities: () => ['onoff'],
      getStoreValue: () => null,
      setStoreValue: async () => {},
    };
    mgr.registerDevice(fake);
    assert.strictEqual(mgr._devices.size, 1);
    mgr.destroy();
    assert.strictEqual(mgr._destroyed, true);
    assert.strictEqual(mgr._devices.size, 0);
    mgr.unregisterDevice('dev-a'); // must no-op
    mgr.destroy(); // second call no-op
  });

  it('quiet-mains candidate matches ZBMINIR2 not battery', () => {
    const { isQuietMainsAvailCandidate } = require('../../lib/helpers/QuietMainsAvailPoll');
    const mains = {
      getCapabilities: () => ['onoff'],
      getSetting: (k) => (k === 'zb_model_id' ? 'ZBMINIR2' : undefined),
      getData: () => ({}),
    };
    const batt = {
      getCapabilities: () => ['measure_battery'],
      getSetting: (k) => (k === 'zb_model_id' ? 'ZBMINIR2' : undefined),
      getData: () => ({}),
    };
    assert.strictEqual(isQuietMainsAvailCandidate(mains), true);
    assert.strictEqual(isQuietMainsAvailCandidate(batt), false);
  });

  it('compose has HomeSuite/Johan harvest couples', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.join(__dirname, '..', '..');
    const sw = JSON.parse(fs.readFileSync(path.join(root, 'drivers/switch_2gang/driver.compose.json'), 'utf8'));
    const plug = JSON.parse(fs.readFileSync(path.join(root, 'drivers/plug_energy_monitor/driver.compose.json'), 'utf8'));
    assert.ok(sw.zigbee.manufacturerName.some((m) => /mtnpt6ws/i.test(m)));
    assert.ok(sw.zigbee.productId.some((p) => /^TS0002$/i.test(p)));
    assert.ok(plug.zigbee.manufacturerName.some((m) => /ddigca5n/i.test(m)));
    assert.ok(plug.zigbee.productId.some((p) => /^TS011F$/i.test(p)));
  });
});
