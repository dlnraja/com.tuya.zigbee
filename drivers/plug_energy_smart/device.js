'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SmartPlugEnergyDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmartPlugEnergyDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SmartPlugEnergyDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SmartPlugEnergyDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmartPlugEnergyDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmartPlugEnergyDevice;
