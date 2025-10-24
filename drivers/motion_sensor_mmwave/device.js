'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * AvattoMotionSensorMmwaveBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoMotionSensorMmwaveBasicDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('AvattoMotionSensorMmwaveBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoMotionSensorMmwaveBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoMotionSensorMmwaveBasicDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoMotionSensorMmwaveBasicDevice;
