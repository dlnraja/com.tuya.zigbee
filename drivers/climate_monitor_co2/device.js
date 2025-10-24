'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * AvattoCo2TempHumidityDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoCo2TempHumidityDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoCo2TempHumidityDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoCo2TempHumidityDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoCo2TempHumidityDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoCo2TempHumidityDevice;
