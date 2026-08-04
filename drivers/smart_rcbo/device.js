'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART RCBO - v9.7.3 UNIFIED (extends UnifiedPlugBase properly)          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ UnifiedPlugBase handles: onoff, electrical measurement, Tuya DP               ║
 * ║  v9.7.3: Standardized initialization and reporting                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartRCBODevice extends UnifiedPlugBase {

  get plugCapabilities() { 
    return ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current']; 
  }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(this).dpMappings || {};
    return {
      ...parentMappings,
      17: { capability: 'measure_current', smartDivisor: true, unit: 'A' },
      18: { capability: 'measure_power', smartDivisor: true, unit: 'W' },
      19: { capability: 'measure_voltage', smartDivisor: true, unit: 'V' },
      20: { capability: 'meter_power', smartDivisor: true, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { await super.onNodeInit({ zclNode  });
      this.log('[RCBO] v9.7.3 ✅ Ready');
    }, 'onNodeInit');
  }

  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    await super.onNodeInit({ zclNode });
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartRCBODevice;

