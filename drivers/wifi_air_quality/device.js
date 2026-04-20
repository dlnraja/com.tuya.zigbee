'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiAirQualityDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '2':  { capability: 'measure_co2' },
      '18': { capability: 'measure_temperature', divisor: 10 },
      '19': { capability: 'measure_humidity', divisor: 10 },
      '20': { capability: 'measure_pm25' },
      '21': { capability: 'measure_voc' },
      '22': { capability: 'measure_formaldehyde', divisor: 100 },
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
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiAirQualityDevice;
