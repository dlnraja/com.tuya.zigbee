'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * AvattoWirelessSwitchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWirelessSwitchDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('AvattoWirelessSwitchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoWirelessSwitchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWirelessSwitchDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoWirelessSwitchDevice;
