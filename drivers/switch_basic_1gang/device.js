'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * Switch1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Switch1gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('Switch1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('Switch1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('Switch1gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Switch1gangDevice;
