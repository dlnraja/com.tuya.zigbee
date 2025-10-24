'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * AvattoWirelessSwitch4gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWirelessSwitch4gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoWirelessSwitch4gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoWirelessSwitch4gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWirelessSwitch4gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoWirelessSwitch4gangDevice;
