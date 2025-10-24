'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartCurtainMotorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartCurtainMotorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartCurtainMotorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartCurtainMotorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartCurtainMotorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartCurtainMotorDevice;
