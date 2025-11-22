'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * SmartPlugDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmartPlugDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('SmartPlugDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SmartPlugDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmartPlugDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmartPlugDevice;
