'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * MoesClimateMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MoesClimateMonitorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('MoesClimateMonitorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('MoesClimateMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('MoesClimateMonitorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = MoesClimateMonitorDevice;
