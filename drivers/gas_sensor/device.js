'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Gas Sensor Device - v5.3.64 SIMPLIFIED
 */
class GasSensorDevice extends HybridSensorBase {

  get mainsPowered() { return true; } // Gas sensors are usually mains powered

  get sensorCapabilities() {
    return ['alarm_gas', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_gas', transform: (v) => v === 1 || v === true },
      2: { capability: 'measure_gas', divisor: 1 }, // Gas concentration
      4: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[GAS] ✅ Gas sensor ready');
  }
}

module.exports = GasSensorDevice;
