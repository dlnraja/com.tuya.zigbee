'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * Switch2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Switch2gangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('Switch2gangDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('Switch2gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('Switch2gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Switch2gangDevice;
