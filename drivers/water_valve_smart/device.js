'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoWaterValveSmartDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWaterValveSmartDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoWaterValveSmartDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoWaterValveSmartDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWaterValveSmartDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoWaterValveSmartDevice;
