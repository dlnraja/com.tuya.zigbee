'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartLockFingerprintDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartLockFingerprintDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartLockFingerprintDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartLockFingerprintDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartLockFingerprintDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartLockFingerprintDevice;
