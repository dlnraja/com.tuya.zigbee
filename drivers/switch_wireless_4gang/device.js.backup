'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * WirelessSwitch4gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class WirelessSwitch4gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('WirelessSwitch4gangDevice initializing...');

      // CRITICAL: Set gang count BEFORE parent init
      this.gangCount = 4;
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('WirelessSwitch4gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('WirelessSwitch4gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = WirelessSwitch4gangDevice;
