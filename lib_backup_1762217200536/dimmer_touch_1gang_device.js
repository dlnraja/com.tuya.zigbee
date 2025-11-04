'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * Dimmer1gangTouchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Dimmer1gangTouchDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('Dimmer1gangTouchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('Dimmer1gangTouchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('Dimmer1gangTouchDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Dimmer1gangTouchDevice;
