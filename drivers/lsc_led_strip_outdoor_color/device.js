'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscLedStripOutdoorColorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscLedStripOutdoorColorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscLedStripOutdoorColorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscLedStripOutdoorColorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscLedStripOutdoorColorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscLedStripOutdoorColorDevice;
