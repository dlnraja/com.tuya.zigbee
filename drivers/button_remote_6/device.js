'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * ZemismartWirelessSwitch6buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartWirelessSwitch6buttonDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('ZemismartWirelessSwitch6buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ZemismartWirelessSwitch6buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartWirelessSwitch6buttonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZemismartWirelessSwitch6buttonDevice;
