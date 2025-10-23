'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscPhilipsBulbColorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscPhilipsBulbColorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscPhilipsBulbColorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscPhilipsBulbColorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscPhilipsBulbColorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscPhilipsBulbColorDevice;
