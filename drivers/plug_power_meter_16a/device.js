'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoSmartPlugPowerMeter16aDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSmartPlugPowerMeter16aDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoSmartPlugPowerMeter16aDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoSmartPlugPowerMeter16aDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSmartPlugPowerMeter16aDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoSmartPlugPowerMeter16aDevice;
