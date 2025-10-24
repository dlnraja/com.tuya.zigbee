'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TemperatureHumidityDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TemperatureHumidityDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TemperatureHumidityDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('TemperatureHumidityDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TemperatureHumidityDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TemperatureHumidityDevice;
