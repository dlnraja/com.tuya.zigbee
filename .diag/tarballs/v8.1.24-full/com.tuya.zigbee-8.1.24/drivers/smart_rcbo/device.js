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

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { await super.onNodeInit({ zclNode  });
      this.log('[RCBO] v9.7.3 ✅ Ready');
    }, 'onNodeInit');
  }

  async onDeleted() {
    await super.onNodeInit({ zclNode });
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartRCBODevice;

