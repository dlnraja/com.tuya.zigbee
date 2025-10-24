'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * MoesSonoffTemperatureHumidityDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MoesSonoffTemperatureHumidityDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('MoesSonoffTemperatureHumidityDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('MoesSonoffTemperatureHumidityDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('MoesSonoffTemperatureHumidityDevice deleted');
    await super.onDeleted();
  }
}

module.exports = MoesSonoffTemperatureHumidityDevice;
