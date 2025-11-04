'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * RemoteSwitchDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class RemoteSwitchDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('RemoteSwitchDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('RemoteSwitchDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('RemoteSwitchDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = RemoteSwitchDevice;
