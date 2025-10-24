'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * LscInnrBulbWhiteDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscInnrBulbWhiteDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('LscInnrBulbWhiteDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('LscInnrBulbWhiteDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscInnrBulbWhiteDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = LscInnrBulbWhiteDevice;
