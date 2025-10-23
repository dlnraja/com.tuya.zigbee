'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * LscPhilipsDimmerSwitchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LscPhilipsDimmerSwitchDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('LscPhilipsDimmerSwitchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('LscPhilipsDimmerSwitchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LscPhilipsDimmerSwitchDevice deleted');
    await super.onDeleted();
  }
}

module.exports = LscPhilipsDimmerSwitchDevice;
