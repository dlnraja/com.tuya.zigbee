'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * ZemismartWirelessSwitch4buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartWirelessSwitch4buttonDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('ZemismartWirelessSwitch4buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ZemismartWirelessSwitch4buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartWirelessSwitch4buttonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZemismartWirelessSwitch4buttonDevice;
