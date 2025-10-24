'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * MotionSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MotionSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('MotionSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('MotionSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('MotionSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = MotionSensorDevice;
