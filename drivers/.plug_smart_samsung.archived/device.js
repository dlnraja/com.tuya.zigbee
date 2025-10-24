'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoSamsungSmartPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSamsungSmartPlugDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSamsungSmartPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoSamsungSmartPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSamsungSmartPlugDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoSamsungSmartPlugDevice;
