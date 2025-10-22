'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * LonsonhoSamsungButtonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LonsonhoSamsungButtonDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('LonsonhoSamsungButtonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LonsonhoSamsungButtonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LonsonhoSamsungButtonDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LonsonhoSamsungButtonDevice;
