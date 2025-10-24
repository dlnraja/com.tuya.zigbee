'use strict';

const SwitchDevice = require('../lib/SwitchDevice');

/**
 * AvattoWallSwitch6gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class AvattoWallSwitch6gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('AvattoWallSwitch6gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('AvattoWallSwitch6gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('AvattoWallSwitch6gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = AvattoWallSwitch6gangDevice;
