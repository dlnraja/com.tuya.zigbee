'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscPhilipsLedStripDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscPhilipsLedStripDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscPhilipsLedStripDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscPhilipsLedStripDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscPhilipsLedStripDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscPhilipsLedStripDevice;
