'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * NousAirQualityMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class NousAirQualityMonitorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('NousAirQualityMonitorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('NousAirQualityMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('NousAirQualityMonitorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = NousAirQualityMonitorDevice;
