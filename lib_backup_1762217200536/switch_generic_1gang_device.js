'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * TuyaSmartSwitch1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSmartSwitch1gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('TuyaSmartSwitch1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('TuyaSmartSwitch1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaSmartSwitch1gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaSmartSwitch1gangDevice;
