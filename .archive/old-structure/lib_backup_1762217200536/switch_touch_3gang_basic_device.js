'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * TouchSwitch3gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TouchSwitch3gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('TouchSwitch3gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('TouchSwitch3gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TouchSwitch3gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TouchSwitch3gangDevice;
