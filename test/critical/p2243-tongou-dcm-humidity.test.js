'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DCM = require('../../lib/managers/DynamicCapabilityManager');

describe('P2243 Tongou DCM humidity phantom block', () => {
  function mgr(driverId) {
    const device = {
      driver: { id: driverId, manifest: { id: driverId, class: 'sensor' } },
      getClass: () => 'sensor',
      _forbiddenCapabilities: [],
      log: () => {},
    };
    const m = Object.create(DCM.prototype);
    m.device = device;
    return m;
  }

  it('blocks humidity/temperature on din_rail_meter and smart_rcbo', () => {
    for (const id of ['din_rail_meter', 'smart_rcbo', 'power_meter']) {
      const m = mgr(id);
      assert.strictEqual(m._isIrrelevantCap('measure_humidity'), true, id);
      assert.strictEqual(m._isIrrelevantCap('measure_temperature'), true, id);
      assert.strictEqual(m._isIrrelevantCap('measure_power'), false, id);
    }
  });

  it('still allows humidity on climate_sensor', () => {
    const m = mgr('climate_sensor');
    assert.strictEqual(m._isIrrelevantCap('measure_humidity'), false);
  });
});
