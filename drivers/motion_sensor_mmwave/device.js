'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * MotionSensorMmwaveBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MotionSensorMmwaveBasicDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('MotionSensorMmwaveBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('MotionSensorMmwaveBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('MotionSensorMmwaveBasicDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = MotionSensorMmwaveBasicDevice;
