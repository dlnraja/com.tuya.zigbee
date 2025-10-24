'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * AvattoPlugBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoPlugBasicDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoPlugBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoPlugBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoPlugBasicDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoPlugBasicDevice;
