'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * ZemismartPresenceSensorRadarDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ZemismartPresenceSensorRadarDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('ZemismartPresenceSensorRadarDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('ZemismartPresenceSensorRadarDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('ZemismartPresenceSensorRadarDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZemismartPresenceSensorRadarDevice;
