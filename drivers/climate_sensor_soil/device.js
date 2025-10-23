'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * TuyaSoilTesterTempHumidDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSoilTesterTempHumidDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TuyaSoilTesterTempHumidDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('TuyaSoilTesterTempHumidDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaSoilTesterTempHumidDevice deleted');
    await super.onDeleted();
  }
}

module.exports = TuyaSoilTesterTempHumidDevice;
