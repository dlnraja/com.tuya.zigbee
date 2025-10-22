'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * SamsungWaterLeakSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SamsungWaterLeakSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('SamsungWaterLeakSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('SamsungWaterLeakSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SamsungWaterLeakSensorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = SamsungWaterLeakSensorDevice;
