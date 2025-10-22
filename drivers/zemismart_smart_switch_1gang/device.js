'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * ZemismartSmartSwitch1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartSmartSwitch1gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('ZemismartSmartSwitch1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartSmartSwitch1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartSmartSwitch1gangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartSmartSwitch1gangDevice;
