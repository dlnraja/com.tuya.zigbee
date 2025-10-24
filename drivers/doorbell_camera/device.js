'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TuyaDoorbellCameraDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaDoorbellCameraDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TuyaDoorbellCameraDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('TuyaDoorbellCameraDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaDoorbellCameraDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaDoorbellCameraDevice;
