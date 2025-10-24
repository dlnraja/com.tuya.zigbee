'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartSolarPanelControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartSolarPanelControllerDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartSolarPanelControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartSolarPanelControllerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartSolarPanelControllerDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartSolarPanelControllerDevice;
