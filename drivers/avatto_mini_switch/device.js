'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoMiniSwitchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoMiniSwitchDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoMiniSwitchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoMiniSwitchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoMiniSwitchDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoMiniSwitchDevice;
