'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartGarageDoorControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartGarageDoorControllerDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartGarageDoorControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartGarageDoorControllerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartGarageDoorControllerDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartGarageDoorControllerDevice;
