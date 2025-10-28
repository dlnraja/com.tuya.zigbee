'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * BulbTunableDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class BulbTunableDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('BulbTunableDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('BulbTunableDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('BulbTunableDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = BulbTunableDevice;
