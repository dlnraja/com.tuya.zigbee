'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoUsbOutletDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoUsbOutletDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoUsbOutletDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoUsbOutletDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoUsbOutletDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoUsbOutletDevice;
