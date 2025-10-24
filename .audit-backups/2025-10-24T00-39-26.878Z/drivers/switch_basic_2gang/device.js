'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoSwitch2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSwitch2gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSwitch2gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoSwitch2gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSwitch2gangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoSwitch2gangDevice;
