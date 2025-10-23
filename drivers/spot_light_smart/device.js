'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoSmartSpotDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSmartSpotDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoSmartSpotDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoSmartSpotDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSmartSpotDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoSmartSpotDevice;
