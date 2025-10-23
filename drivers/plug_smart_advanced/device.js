'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoSmartPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSmartPlugDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSmartPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoSmartPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSmartPlugDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoSmartPlugDevice;
