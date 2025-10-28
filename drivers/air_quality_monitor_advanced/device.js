'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * AirQualityMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AirQualityMonitorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('AirQualityMonitorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('AirQualityMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AirQualityMonitorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AirQualityMonitorDevice;
