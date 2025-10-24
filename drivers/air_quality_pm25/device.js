'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * Pm25DetectorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Pm25DetectorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('Pm25DetectorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('Pm25DetectorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('Pm25DetectorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Pm25DetectorDevice;
