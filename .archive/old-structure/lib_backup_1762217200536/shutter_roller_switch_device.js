'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * RollerShutterSwitchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class RollerShutterSwitchDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('RollerShutterSwitchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('RollerShutterSwitchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('RollerShutterSwitchDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = RollerShutterSwitchDevice;
