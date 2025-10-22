'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartDoorControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartDoorControllerDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartDoorControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartDoorControllerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartDoorControllerDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartDoorControllerDevice;
