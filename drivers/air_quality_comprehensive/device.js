'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TuyaComprehensiveAirMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaComprehensiveAirMonitorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TuyaComprehensiveAirMonitorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('TuyaComprehensiveAirMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaComprehensiveAirMonitorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaComprehensiveAirMonitorDevice;
