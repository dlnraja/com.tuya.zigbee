'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * WaterValveDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class WaterValveDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('WaterValveDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('WaterValveDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('WaterValveDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = WaterValveDevice;
