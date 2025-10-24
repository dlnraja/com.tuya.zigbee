'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * NousSmartPlugDimmerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class NousSmartPlugDimmerDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('NousSmartPlugDimmerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('NousSmartPlugDimmerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('NousSmartPlugDimmerDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = NousSmartPlugDimmerDevice;
