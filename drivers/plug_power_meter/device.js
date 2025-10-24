'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoPowerMeterSocketDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoPowerMeterSocketDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoPowerMeterSocketDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoPowerMeterSocketDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoPowerMeterSocketDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoPowerMeterSocketDevice;
