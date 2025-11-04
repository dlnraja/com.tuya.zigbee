'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SmartPlugPowerMeter16aDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SmartPlugPowerMeter16aDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('SmartPlugPowerMeter16aDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SmartPlugPowerMeter16aDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SmartPlugPowerMeter16aDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SmartPlugPowerMeter16aDevice;
