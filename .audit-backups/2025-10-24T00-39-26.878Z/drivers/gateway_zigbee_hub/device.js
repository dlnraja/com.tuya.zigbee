'use strict';

const BaseHybridDevice = require('../lib/BaseHybridDevice');

/**
 * NousZigbeeGatewayHubDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class NousZigbeeGatewayHubDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('NousZigbeeGatewayHubDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('NousZigbeeGatewayHubDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('NousZigbeeGatewayHubDevice deleted');
    await super.onDeleted();
  }
}

module.exports = NousZigbeeGatewayHubDevice;
