'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoWirelessSwitch5buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWirelessSwitch5buttonDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoWirelessSwitch5buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoWirelessSwitch5buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWirelessSwitch5buttonDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoWirelessSwitch5buttonDevice;
