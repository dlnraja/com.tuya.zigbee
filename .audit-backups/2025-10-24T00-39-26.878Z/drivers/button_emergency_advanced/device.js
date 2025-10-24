'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * MoesSosEmergencyButtonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MoesSosEmergencyButtonDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('MoesSosEmergencyButtonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('MoesSosEmergencyButtonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('MoesSosEmergencyButtonDevice deleted');
    await super.onDeleted();
  }
}

module.exports = MoesSosEmergencyButtonDevice;
