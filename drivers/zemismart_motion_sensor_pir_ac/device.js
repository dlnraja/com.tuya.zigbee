'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartMotionSensorPirAcDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartMotionSensorPirAcDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartMotionSensorPirAcDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartMotionSensorPirAcDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartMotionSensorPirAcDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartMotionSensorPirAcDevice;
