'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * ZemismartWirelessSwitch3buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartWirelessSwitch3buttonDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('ZemismartWirelessSwitch3buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ZemismartWirelessSwitch3buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartWirelessSwitch3buttonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZemismartWirelessSwitch3buttonDevice;
