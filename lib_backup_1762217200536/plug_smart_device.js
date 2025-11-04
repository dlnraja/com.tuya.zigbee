'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * PlugSmartDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PlugSmartDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('PlugSmartDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('PlugSmartDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('PlugSmartDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = PlugSmartDevice;
