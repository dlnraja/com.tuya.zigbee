'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * SonoffMotionSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SonoffMotionSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('SonoffMotionSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('SonoffMotionSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SonoffMotionSensorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = SonoffMotionSensorDevice;
