'use strict';
const { SensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { equalsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

class AirQualityComprehensiveDevice extends SensorBase {

  get mainsPowered() { return true; }

  get isEightYgSmartAirbox() {
    return equalsCI(this.getSetting('zb_manufacturer_name') || '', '_TZE200_8ygsuhe1');
  }

  get sensorCapabilities() {
    const capabilities = ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_voc', 'measure_formaldehyde'];
    if (!this.isEightYgSmartAirbox) capabilities.push('measure_pm25');
    return capabilities;
  }

  get dpMappings() {
    return {
      2: { capability: 'measure_co2', divisor: 1 },
      18: { capability: 'measure_temperature', smartDivisor: true },
      19: { capability: 'measure_humidity', smartDivisor: true },
      20: this.isEightYgSmartAirbox
        ? { capability: null, internal: 'secondary_air_quality_value' }
        : { capability: 'measure_pm25', divisor: 1 },
      21: { capability: 'measure_voc', divisor: 1 },
      22: { capability: 'measure_formaldehyde', smartDivisor: true }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });

      // --- Attribute Reporting Configuration ---
      const mfr = this.getSetting('zb_manufacturer_name') || '';
      const isTuyaDP = mfr.startsWith('_TZE') || this.getSetting('zb_model_id')?.startsWith('TS0601');

      if (!isTuyaDP) {
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
          this.log('[AIR-QUALITY] 📊 Attribute reporting configured successfully');
        } catch (err) {
          this.log('[AIR-QUALITY] ⚠️ Attribute reporting config failed:', err.message);
        }
      } else {
        this.log('[AIR-QUALITY] ℹ️ TS0601 device - skipping ZCL attribute reporting, using Tuya DP protocol');
      }

      // Prevents false low-battery alerts (e.g. _TZE200_8ygsuhe1 Smart Airbox is USB-powered)
      if (this.mainsPowered && this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => { });
        this.log('[AIR-QUALITY] 🔌 Mains-powered: removed measure_battery');
      }

      // This Smart Airbox does not expose particulate measurements. Avoid stale,
      // permanently empty PM tiles that were previously mistaken for DP20 data.
      if (this.isEightYgSmartAirbox) {
        await this.removeCapability('measure_pm25').catch(() => { });
        await this.removeCapability('measure_pm10').catch(() => { });
      }

      // v5.11.15: Ensure VOC and HCHO capabilities are added for devices that report them
      const dpMap = this.dpMappings || {};
      if (dpMap[21] && !this.hasCapability('measure_voc')) {
        await this.addCapability('measure_voc').catch(() => { });
        this.log('[AIR-QUALITY] ➕ Added measure_voc capability');
      }
      if (dpMap[22] && !this.hasCapability('measure_formaldehyde')) {
        await this.addCapability('measure_formaldehyde').catch(() => { });
        this.log('[AIR-QUALITY] ➕ Added measure_formaldehyde capability');
      }

      this.log('[AIR-QUALITY] ✅ Ready');
    }, 'onNodeInit');
  }

  onDeleted() {
    this.log('[AIR-QUALITY] 🗑️ Device deleted, cleaning up');
    if (this._batteryHandler) {
      this._batteryHandler.destroy();
      this._batteryHandler = null;
    }
    if (this._batteryPollInterval) {
      clearInterval(this._batteryPollInterval);
      this._batteryPollInterval = null;
    }
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = AirQualityComprehensiveDevice;
