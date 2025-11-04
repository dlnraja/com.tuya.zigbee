'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * PlugEnergyMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PlugEnergyMonitorDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('PlugEnergyMonitorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('PlugEnergyMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('PlugEnergyMonitorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = PlugEnergyMonitorDevice;
