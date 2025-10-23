'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoLedStripProDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoLedStripProDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoLedStripProDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoLedStripProDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoLedStripProDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoLedStripProDevice;
