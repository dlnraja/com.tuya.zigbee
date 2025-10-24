'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * ZemismartWirelessSwitch8buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartWirelessSwitch8buttonDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('ZemismartWirelessSwitch8buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartWirelessSwitch8buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartWirelessSwitch8buttonDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartWirelessSwitch8buttonDevice;
