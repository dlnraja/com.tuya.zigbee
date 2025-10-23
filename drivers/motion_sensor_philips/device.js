'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * PhilipsMotionSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PhilipsMotionSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('PhilipsMotionSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('PhilipsMotionSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('PhilipsMotionSensorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = PhilipsMotionSensorDevice;
