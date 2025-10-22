'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartWirelessSwitch1buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartWirelessSwitch1buttonDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartWirelessSwitch1buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartWirelessSwitch1buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartWirelessSwitch1buttonDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartWirelessSwitch1buttonDevice;
