'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoPlugSmartDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoPlugSmartDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoPlugSmartDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoPlugSmartDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoPlugSmartDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoPlugSmartDevice;
