'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * ZemismartWallSwitch1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartWallSwitch1gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('ZemismartWallSwitch1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ZemismartWallSwitch1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartWallSwitch1gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZemismartWallSwitch1gangDevice;
