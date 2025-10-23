'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoWirelessSwitch6gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWirelessSwitch6gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoWirelessSwitch6gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoWirelessSwitch6gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWirelessSwitch6gangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoWirelessSwitch6gangDevice;
