'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
// A8: NaN Safety - use safeDivide/safeMultiply
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiAirQualityDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '2':  { capability: 'measure_co2' },
      '18': { capability: 'measure_temperature', smartDivisor: true },
      '19': { capability: 'measure_humidity', smartDivisor: true },
      '20': { capability: 'measure_pm25' },
      '21': { capability: 'measure_voc' },
      '22': { capability: 'measure_formaldehyde', smartDivisor: true },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_pm25']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-AIR-QUALITY] Ready');
  }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiAirQualityDevice;
return module.exports;
});
