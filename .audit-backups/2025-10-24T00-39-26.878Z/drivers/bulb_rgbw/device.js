'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscOsramBulbRgbwDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscOsramBulbRgbwDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscOsramBulbRgbwDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscOsramBulbRgbwDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscOsramBulbRgbwDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscOsramBulbRgbwDevice;
