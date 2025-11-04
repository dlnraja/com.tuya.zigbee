'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * WirelessSwitch8buttonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class WirelessSwitch8buttonDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('WirelessSwitch8buttonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('WirelessSwitch8buttonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('WirelessSwitch8buttonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = WirelessSwitch8buttonDevice;
