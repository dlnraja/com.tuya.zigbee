'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class AirQualityComprehensiveDevice extends HybridSensorBase {
  get mainsPowered() { return true; }
  get sensorCapabilities() { return ['measure_co2', 'measure_pm25', 'measure_temperature', 'measure_humidity', 'measure_voc', 'measure_formaldehyde']; }
  get dpMappings() {
    return {
      2: { capability: 'measure_co2', divisor: 1 },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_humidity', divisor: 10 },
      20: { capability: 'measure_pm25', divisor: 1 },
      21: { capability: 'measure_voc', divisor: 1 },
      22: { capability: 'measure_formaldehyde', divisor: 100 }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.11.15: Remove battery capability for mains-powered air quality monitors
    // Prevents false low-battery alerts (e.g. _TZE200_8ygsuhe1 Smart Airbox is USB-powered)
    if (this.mainsPowered && this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
      this.log('[AIR-QUALITY] 🔌 Mains-powered: removed measure_battery');
    }

    // v5.11.15: Ensure VOC and HCHO capabilities are added for devices that report them
    for (const cap of ['measure_voc', 'measure_formaldehyde']) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
        this.log(`[AIR-QUALITY] ➕ Added ${cap} capability`);
      }
    }

    this.log('[AIR-QUALITY] ✅ Ready');
  }
}
module.exports = AirQualityComprehensiveDevice;
