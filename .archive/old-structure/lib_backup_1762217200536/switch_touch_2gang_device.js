'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * TouchSwitch2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TouchSwitch2gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('TouchSwitch2gangDevice initializing...');

      // CRITICAL: Set gang count BEFORE parent init
      this.gangCount = 2;
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('TouchSwitch2gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TouchSwitch2gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TouchSwitch2gangDevice;
