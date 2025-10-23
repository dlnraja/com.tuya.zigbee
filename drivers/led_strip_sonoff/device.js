'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscSonoffLedStripDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscSonoffLedStripDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscSonoffLedStripDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscSonoffLedStripDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscSonoffLedStripDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscSonoffLedStripDevice;
