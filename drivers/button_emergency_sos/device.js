'use strict';

const ButtonDevice = require('../lib/ButtonDevice');

/**
 * AvattoSosEmergencyButtonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoSosEmergencyButtonDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('AvattoSosEmergencyButtonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoSosEmergencyButtonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoSosEmergencyButtonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoSosEmergencyButtonDevice;
