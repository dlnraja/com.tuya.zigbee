'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * AvattoRemoteSwitchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoRemoteSwitchDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('AvattoRemoteSwitchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoRemoteSwitchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoRemoteSwitchDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoRemoteSwitchDevice;
