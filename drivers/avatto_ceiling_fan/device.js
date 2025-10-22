'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoCeilingFanDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoCeilingFanDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoCeilingFanDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoCeilingFanDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoCeilingFanDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoCeilingFanDevice;
