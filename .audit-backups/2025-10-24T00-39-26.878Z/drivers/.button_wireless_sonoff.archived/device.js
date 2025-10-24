'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * LonsonhoSonoffButtonWirelessDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LonsonhoSonoffButtonWirelessDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('LonsonhoSonoffButtonWirelessDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LonsonhoSonoffButtonWirelessDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LonsonhoSonoffButtonWirelessDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LonsonhoSonoffButtonWirelessDevice;
