'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartTempHumidSensorAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartTempHumidSensorAdvancedDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartTempHumidSensorAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartTempHumidSensorAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartTempHumidSensorAdvancedDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartTempHumidSensorAdvancedDevice;
