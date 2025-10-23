'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoBulbTunableDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoBulbTunableDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoBulbTunableDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoBulbTunableDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoBulbTunableDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoBulbTunableDevice;
