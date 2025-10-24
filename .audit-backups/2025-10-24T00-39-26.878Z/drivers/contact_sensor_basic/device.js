'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LonsonhoContactSensorBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LonsonhoContactSensorBasicDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LonsonhoContactSensorBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LonsonhoContactSensorBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LonsonhoContactSensorBasicDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LonsonhoContactSensorBasicDevice;
