'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoDimmer1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoDimmer1gangDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoDimmer1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoDimmer1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoDimmer1gangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoDimmer1gangDevice;
