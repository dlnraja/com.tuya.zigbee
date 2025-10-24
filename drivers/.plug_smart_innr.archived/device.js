'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoInnrSmartPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoInnrSmartPlugDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoInnrSmartPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoInnrSmartPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoInnrSmartPlugDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoInnrSmartPlugDevice;
