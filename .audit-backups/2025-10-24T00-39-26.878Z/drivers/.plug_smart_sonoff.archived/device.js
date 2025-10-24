'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoSonoffSmartPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSonoffSmartPlugDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSonoffSmartPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoSonoffSmartPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSonoffSmartPlugDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoSonoffSmartPlugDevice;
