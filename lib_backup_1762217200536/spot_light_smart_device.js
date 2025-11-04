'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * SmartSpotDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmartSpotDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('SmartSpotDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SmartSpotDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmartSpotDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmartSpotDevice;
