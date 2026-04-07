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
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected    // Prevents false low-battery alerts (e.g. _TZE200_8ygsuhe1 Smart Airbox is USB-powered)
    if (this.mainsPowered && this.hasCapability('measure_battery')) {this.log('[AIR-QUALITY] 🔌 Mains-powered: removed measure_battery');
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


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = AirQualityComprehensiveDevice;
