'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * AvattoSmartSwitch2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSmartSwitch2gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSmartSwitch2gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoSmartSwitch2gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSmartSwitch2gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoSmartSwitch2gangDevice;
