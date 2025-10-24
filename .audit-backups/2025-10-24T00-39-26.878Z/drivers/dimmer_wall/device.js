'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoDimmerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoDimmerDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoDimmerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoDimmerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoDimmerDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoDimmerDevice;
