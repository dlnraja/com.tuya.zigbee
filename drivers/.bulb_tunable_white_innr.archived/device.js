'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscInnrBulbTunableWhiteDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscInnrBulbTunableWhiteDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscInnrBulbTunableWhiteDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscInnrBulbTunableWhiteDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscInnrBulbTunableWhiteDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscInnrBulbTunableWhiteDevice;
