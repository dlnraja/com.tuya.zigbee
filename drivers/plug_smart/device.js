'use strict';

const { HybridPlugBase } = require('../../lib/devices');

/**
 * Smart Plug Device - v5.3.64 SIMPLIFIED
 */
class SmartPlugDevice extends HybridPlugBase {

  get plugCapabilities() {
    return ['onoff'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[PLUG] ✅ Smart plug ready');
  }
}

module.exports = SmartPlugDevice;
