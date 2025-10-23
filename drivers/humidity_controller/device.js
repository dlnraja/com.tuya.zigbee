'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartHumidityControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartHumidityControllerDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartHumidityControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartHumidityControllerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartHumidityControllerDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartHumidityControllerDevice;
