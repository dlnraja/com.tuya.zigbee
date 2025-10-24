'use strict';

const ButtonDevice = require('../../lib/ButtonDevice');

/**
 * SosEmergencyButtonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SosEmergencyButtonDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('SosEmergencyButtonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SosEmergencyButtonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SosEmergencyButtonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SosEmergencyButtonDevice;
