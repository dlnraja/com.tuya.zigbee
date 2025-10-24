'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * NousZbbridgeDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class NousZbbridgeDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('NousZbbridgeDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('NousZbbridgeDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('NousZbbridgeDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = NousZbbridgeDevice;
