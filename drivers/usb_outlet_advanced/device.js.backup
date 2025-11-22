'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * UsbOutletAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class UsbOutletAdvancedDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('UsbOutletAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('UsbOutletAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('UsbOutletAdvancedDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = UsbOutletAdvancedDevice;
