'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartSmokeTempHumidSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartSmokeTempHumidSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartSmokeTempHumidSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartSmokeTempHumidSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartSmokeTempHumidSensorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartSmokeTempHumidSensorDevice;
