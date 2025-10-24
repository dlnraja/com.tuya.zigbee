'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoPhilipsSmartPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoPhilipsSmartPlugDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoPhilipsSmartPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoPhilipsSmartPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoPhilipsSmartPlugDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoPhilipsSmartPlugDevice;
