'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartGasDetectorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartGasDetectorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartGasDetectorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartGasDetectorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartGasDetectorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartGasDetectorDevice;
