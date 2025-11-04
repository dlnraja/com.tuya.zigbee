'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * WallSwitch5gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class WallSwitch5gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('WallSwitch5gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('WallSwitch5gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('WallSwitch5gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = WallSwitch5gangDevice;
