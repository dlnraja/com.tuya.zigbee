'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * SolarPanelControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SolarPanelControllerDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('SolarPanelControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SolarPanelControllerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SolarPanelControllerDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SolarPanelControllerDevice;
