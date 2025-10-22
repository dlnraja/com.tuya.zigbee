'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartSmokeDetectorTempHumidityAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartSmokeDetectorTempHumidityAdvancedDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartSmokeDetectorTempHumidityAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartSmokeDetectorTempHumidityAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartSmokeDetectorTempHumidityAdvancedDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartSmokeDetectorTempHumidityAdvancedDevice;
