'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * TuyaSmartSwitch3gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSmartSwitch3gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('TuyaSmartSwitch3gangDevice initializing...');

      // CRITICAL: Set gang count BEFORE parent init
      this.gangCount = 3;
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('TuyaSmartSwitch3gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaSmartSwitch3gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaSmartSwitch3gangDevice;
