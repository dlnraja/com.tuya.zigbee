'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * AvattoEnergyMonitoringPlugAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoEnergyMonitoringPlugAdvancedDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoEnergyMonitoringPlugAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoEnergyMonitoringPlugAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoEnergyMonitoringPlugAdvancedDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoEnergyMonitoringPlugAdvancedDevice;
