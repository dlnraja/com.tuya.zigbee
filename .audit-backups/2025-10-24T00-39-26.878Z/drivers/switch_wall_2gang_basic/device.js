'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoWallSwitch2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWallSwitch2gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoWallSwitch2gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoWallSwitch2gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWallSwitch2gangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoWallSwitch2gangDevice;
