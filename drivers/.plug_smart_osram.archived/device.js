'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoOsramSmartPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoOsramSmartPlugDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoOsramSmartPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoOsramSmartPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoOsramSmartPlugDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoOsramSmartPlugDevice;
