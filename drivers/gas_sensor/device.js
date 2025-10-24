'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TuyaGasSensorTs0601Device - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaGasSensorTs0601Device extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TuyaGasSensorTs0601Device initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('TuyaGasSensorTs0601Device initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaGasSensorTs0601Device deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaGasSensorTs0601Device;
