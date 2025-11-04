'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SmartSwitch2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmartSwitch2gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('SmartSwitch2gangDevice initializing...');
    
    // CRITICAL: Set gang count BEFORE parent init
    this.gangCount = 2;
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SmartSwitch2gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmartSwitch2gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmartSwitch2gangDevice;
