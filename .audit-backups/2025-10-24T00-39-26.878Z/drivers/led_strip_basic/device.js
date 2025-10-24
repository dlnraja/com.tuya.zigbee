'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoLedStripBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoLedStripBasicDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoLedStripBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoLedStripBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoLedStripBasicDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoLedStripBasicDevice;
