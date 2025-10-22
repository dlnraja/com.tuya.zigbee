'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * LonsonhoWirelessButton2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LonsonhoWirelessButton2gangDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('LonsonhoWirelessButton2gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LonsonhoWirelessButton2gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LonsonhoWirelessButton2gangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LonsonhoWirelessButton2gangDevice;
