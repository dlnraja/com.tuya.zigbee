'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * SmartBulbWhiteDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmartBulbWhiteDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('SmartBulbWhiteDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SmartBulbWhiteDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmartBulbWhiteDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmartBulbWhiteDevice;
