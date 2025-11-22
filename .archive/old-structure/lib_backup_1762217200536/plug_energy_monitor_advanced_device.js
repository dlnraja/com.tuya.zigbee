'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * EnergyMonitoringPlugAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class EnergyMonitoringPlugAdvancedDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('EnergyMonitoringPlugAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('EnergyMonitoringPlugAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('EnergyMonitoringPlugAdvancedDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = EnergyMonitoringPlugAdvancedDevice;
