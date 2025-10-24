'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * PirRadarIlluminationSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PirRadarIlluminationSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('PirRadarIlluminationSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('PirRadarIlluminationSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('PirRadarIlluminationSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = PirRadarIlluminationSensorDevice;
