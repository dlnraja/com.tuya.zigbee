'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoSmartBulbDimmerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSmartBulbDimmerDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoSmartBulbDimmerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoSmartBulbDimmerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSmartBulbDimmerDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoSmartBulbDimmerDevice;
