'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * NousOsramOutdoorPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class NousOsramOutdoorPlugDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('NousOsramOutdoorPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('NousOsramOutdoorPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('NousOsramOutdoorPlugDevice deleted');
    await super.onDeleted();
  }
}

module.exports = NousOsramOutdoorPlugDevice;
