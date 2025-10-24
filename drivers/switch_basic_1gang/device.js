'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * ZemismartSwitch1gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartSwitch1gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('ZemismartSwitch1gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ZemismartSwitch1gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartSwitch1gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZemismartSwitch1gangDevice;
