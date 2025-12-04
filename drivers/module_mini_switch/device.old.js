'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * MiniSwitchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MiniSwitchDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    this.log('MiniSwitchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('MiniSwitchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('MiniSwitchDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = MiniSwitchDevice;
