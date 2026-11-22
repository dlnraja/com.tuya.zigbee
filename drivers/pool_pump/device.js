'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

/**
 * Pool/Spa Pump Controller Device
 * v9.7.3: Unified high-power relay control with energy monitoring
 */
class PoolPumpDevice extends UnifiedPlugBase {

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => !!v },
      16: { capability: 'onoff', transform: (v) => !!v },
      18: { capability: 'measure_power', divisor: 1 },
      101: { capability: 'meter_power', smartDivisor: true }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { await super.onNodeInit({ zclNode  });
      this.log('Pool Pump Controller [OK] v9.7.3 Ready');
    }, 'onNodeInit');
  }

  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = PoolPumpDevice;
return module.exports;
});
