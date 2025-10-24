'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscPhilipsBulbWhiteDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscPhilipsBulbWhiteDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscPhilipsBulbWhiteDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('LscPhilipsBulbWhiteDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscPhilipsBulbWhiteDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = LscPhilipsBulbWhiteDevice;
