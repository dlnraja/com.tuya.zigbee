'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * ZemismartWirelessSwitch1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartWirelessSwitch1gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('ZemismartWirelessSwitch1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ZemismartWirelessSwitch1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartWirelessSwitch1gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZemismartWirelessSwitch1gangDevice;
