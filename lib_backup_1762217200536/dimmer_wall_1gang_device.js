'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * Dimmer1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Dimmer1gangDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('Dimmer1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('Dimmer1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('Dimmer1gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Dimmer1gangDevice;
