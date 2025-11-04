'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * UsbOutletDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class UsbOutletDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('UsbOutletDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('UsbOutletDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('UsbOutletDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = UsbOutletDevice;
