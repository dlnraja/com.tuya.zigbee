'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartLockBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartLockBasicDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartLockBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartLockBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartLockBasicDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartLockBasicDevice;
