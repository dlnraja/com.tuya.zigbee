'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * ZemismartPm25DetectorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartPm25DetectorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartPm25DetectorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('ZemismartPm25DetectorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartPm25DetectorDevice deleted');
    await super.onDeleted();
  }
}

module.exports = ZemismartPm25DetectorDevice;
