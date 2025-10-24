'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoWirelessSwitch4buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWirelessSwitch4buttonDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoWirelessSwitch4buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoWirelessSwitch4buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWirelessSwitch4buttonDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoWirelessSwitch4buttonDevice;
