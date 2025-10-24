'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * TuyaSirenDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSirenDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TuyaSirenDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('TuyaSirenDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaSirenDevice deleted');
    await super.onDeleted();
  }
}

module.exports = TuyaSirenDevice;
