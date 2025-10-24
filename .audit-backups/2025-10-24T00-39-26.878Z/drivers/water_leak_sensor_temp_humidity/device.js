'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartTempHumidSensorLeakDetectorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartTempHumidSensorLeakDetectorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartTempHumidSensorLeakDetectorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartTempHumidSensorLeakDetectorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartTempHumidSensorLeakDetectorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartTempHumidSensorLeakDetectorDevice;
