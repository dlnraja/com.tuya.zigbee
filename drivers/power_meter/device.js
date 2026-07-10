'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class PowerMeterDevice extends UnifiedPlugBase {
  // v9.7.3: Standardized Power Meter
  // Inherits hybrid ZCL/Tuya support from UnifiedPlugBase.

  get plugCapabilities() {
    return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  get dpMappings() {
    return {
      17: { capability: 'measure_current', smartDivisor: true },
      18: { capability: 'measure_power', smartDivisor: true },
      19: { capability: 'measure_voltage', smartDivisor: true },
      20: { capability: 'meter_power', smartDivisor: true }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Unified initialization
      await super.onNodeInit({ zclNode  });
      this.log('[POWER-METER] ✅ v9.7.3 Standardized initialization complete');
    }, 'onNodeInit');
  }

  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = PowerMeterDevice;
