'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoSmartSwitch4gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSmartSwitch4gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSmartSwitch4gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoSmartSwitch4gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSmartSwitch4gangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoSmartSwitch4gangDevice;
