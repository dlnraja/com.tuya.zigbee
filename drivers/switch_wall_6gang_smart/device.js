'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoSmartSwitch6gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSmartSwitch6gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSmartSwitch6gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoSmartSwitch6gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSmartSwitch6gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoSmartSwitch6gangDevice;
