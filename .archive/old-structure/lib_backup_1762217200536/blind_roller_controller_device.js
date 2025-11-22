'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * RollerBlindControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class RollerBlindControllerDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('RollerBlindControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('RollerBlindControllerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('RollerBlindControllerDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = RollerBlindControllerDevice;
