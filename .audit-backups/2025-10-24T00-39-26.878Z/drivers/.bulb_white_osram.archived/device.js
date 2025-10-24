'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscOsramBulbWhiteDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscOsramBulbWhiteDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscOsramBulbWhiteDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscOsramBulbWhiteDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscOsramBulbWhiteDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscOsramBulbWhiteDevice;
