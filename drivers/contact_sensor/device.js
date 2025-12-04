'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Contact Sensor Device - v5.3.64 SIMPLIFIED
 * Extends HybridSensorBase for automatic EF00/ZCL handling
 */
class ContactSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_contact', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_contact', transform: (v) => v === 0 }, // 0=open, 1=closed
      2: { capability: 'measure_battery', divisor: 1 },
      3: { capability: 'alarm_battery', transform: (v) => v === 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[CONTACT] ✅ Contact sensor ready');
  }
}

module.exports = ContactSensorDevice;
