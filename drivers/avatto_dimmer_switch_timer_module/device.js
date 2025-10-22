'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * AvattoDimmerSwitchTimerModuleDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoDimmerSwitchTimerModuleDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoDimmerSwitchTimerModuleDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoDimmerSwitchTimerModuleDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoDimmerSwitchTimerModuleDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoDimmerSwitchTimerModuleDevice;
