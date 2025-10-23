'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoLedStripAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoLedStripAdvancedDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoLedStripAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoLedStripAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoLedStripAdvancedDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoLedStripAdvancedDevice;
