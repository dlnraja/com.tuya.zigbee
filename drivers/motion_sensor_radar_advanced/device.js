'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * RadarMotionSensorAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class RadarMotionSensorAdvancedDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('RadarMotionSensorAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('RadarMotionSensorAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('RadarMotionSensorAdvancedDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = RadarMotionSensorAdvancedDevice;
