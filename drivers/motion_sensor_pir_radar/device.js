'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartPirRadarIlluminationSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartPirRadarIlluminationSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartPirRadarIlluminationSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartPirRadarIlluminationSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartPirRadarIlluminationSensorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartPirRadarIlluminationSensorDevice;
