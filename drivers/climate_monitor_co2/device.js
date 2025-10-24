'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * Co2TempHumidityDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Co2TempHumidityDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('Co2TempHumidityDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('Co2TempHumidityDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('Co2TempHumidityDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Co2TempHumidityDevice;
