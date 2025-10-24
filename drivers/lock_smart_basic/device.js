'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * LockBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LockBasicDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LockBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('LockBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LockBasicDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = LockBasicDevice;
