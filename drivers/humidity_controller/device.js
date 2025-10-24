'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * HumidityControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class HumidityControllerDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('HumidityControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('HumidityControllerDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('HumidityControllerDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = HumidityControllerDevice;
