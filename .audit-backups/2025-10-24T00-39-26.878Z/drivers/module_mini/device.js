'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoMiniDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoMiniDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoMiniDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoMiniDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoMiniDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoMiniDevice;
