'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * LonsonhoSamsungContactSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LonsonhoSamsungContactSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LonsonhoSamsungContactSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('LonsonhoSamsungContactSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LonsonhoSamsungContactSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = LonsonhoSamsungContactSensorDevice;
