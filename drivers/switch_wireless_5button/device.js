'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * WirelessSwitch5buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class WirelessSwitch5buttonDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('WirelessSwitch5buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('WirelessSwitch5buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('WirelessSwitch5buttonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = WirelessSwitch5buttonDevice;
