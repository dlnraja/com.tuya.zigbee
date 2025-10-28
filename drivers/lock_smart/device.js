'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * LockSmartDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LockSmartDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('LockSmartDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('LockSmartDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LockSmartDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = LockSmartDevice;
