'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SmartPlugDimmerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmartPlugDimmerDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('SmartPlugDimmerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SmartPlugDimmerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmartPlugDimmerDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmartPlugDimmerDevice;
