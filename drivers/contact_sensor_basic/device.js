'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * ContactSensorBasicDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ContactSensorBasicDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ContactSensorBasicDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ContactSensorBasicDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ContactSensorBasicDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ContactSensorBasicDevice;
