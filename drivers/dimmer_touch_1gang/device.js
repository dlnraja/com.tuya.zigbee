'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * AvattoDimmer1gangTouchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoDimmer1gangTouchDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoDimmer1gangTouchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoDimmer1gangTouchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoDimmer1gangTouchDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoDimmer1gangTouchDevice;
