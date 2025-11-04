'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * DimmerTouchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class DimmerTouchDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('DimmerTouchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('DimmerTouchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('DimmerTouchDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = DimmerTouchDevice;
