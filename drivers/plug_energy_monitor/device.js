'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoPlugEnergyMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoPlugEnergyMonitorDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoPlugEnergyMonitorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoPlugEnergyMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoPlugEnergyMonitorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoPlugEnergyMonitorDevice;
