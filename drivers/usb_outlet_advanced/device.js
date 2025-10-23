'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoUsbOutletAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoUsbOutletAdvancedDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoUsbOutletAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('AvattoUsbOutletAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoUsbOutletAdvancedDevice deleted');
    await super.onDeleted();
  }
}

module.exports = AvattoUsbOutletAdvancedDevice;
