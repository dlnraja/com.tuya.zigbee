'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * Switch5gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Switch5gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('Switch5gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('Switch5gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('Switch5gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Switch5gangDevice;
