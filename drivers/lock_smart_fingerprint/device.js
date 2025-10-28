'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * LockFingerprintDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LockFingerprintDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('LockFingerprintDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('LockFingerprintDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LockFingerprintDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = LockFingerprintDevice;
