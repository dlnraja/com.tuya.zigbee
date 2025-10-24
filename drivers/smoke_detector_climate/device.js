'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * SmokeTempHumidSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmokeTempHumidSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('SmokeTempHumidSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SmokeTempHumidSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmokeTempHumidSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmokeTempHumidSensorDevice;
