'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoRadiatorValveDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoRadiatorValveDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoRadiatorValveDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoRadiatorValveDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoRadiatorValveDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoRadiatorValveDevice;
