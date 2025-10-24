'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoDimmerTouchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoDimmerTouchDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoDimmerTouchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoDimmerTouchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoDimmerTouchDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoDimmerTouchDevice;
