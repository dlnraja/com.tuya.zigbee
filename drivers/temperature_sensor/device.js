'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartTemperatureSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartTemperatureSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartTemperatureSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartTemperatureSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartTemperatureSensorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartTemperatureSensorDevice;
