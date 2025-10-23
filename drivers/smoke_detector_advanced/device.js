'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartSmartSmokeDetectorAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartSmartSmokeDetectorAdvancedDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartSmartSmokeDetectorAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartSmartSmokeDetectorAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartSmartSmokeDetectorAdvancedDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartSmartSmokeDetectorAdvancedDevice;
