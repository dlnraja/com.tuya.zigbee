'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * P130: Was log-only DP dump - rebase on UnifiedLightBase for controllable onoff/dim.
 */
class DimmerAirPurifierDevice extends UnifiedLightBase {
  get lightCapabilities() {
    return ['onoff', 'dim', 'measure_power', 'measure_pm25'];
  }

  get dpMappings() {
    return {
      ...super.dpMappings,
      2: { capability: 'measure_pm25', smartDivisor: true },
      22: { capability: 'measure_pm25', smartDivisor: true },
    };
  }
}

module.exports = DimmerAirPurifierDevice;
return module.exports;
});
