'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscDimmerWirelessDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscDimmerWirelessDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscDimmerWirelessDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscDimmerWirelessDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscDimmerWirelessDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscDimmerWirelessDevice;
