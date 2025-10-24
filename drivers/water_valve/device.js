'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * AvattoWaterValveDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWaterValveDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoWaterValveDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoWaterValveDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWaterValveDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoWaterValveDevice;
