'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscBulbWhiteAmbianceDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscBulbWhiteAmbianceDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscBulbWhiteAmbianceDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscBulbWhiteAmbianceDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscBulbWhiteAmbianceDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscBulbWhiteAmbianceDevice;
