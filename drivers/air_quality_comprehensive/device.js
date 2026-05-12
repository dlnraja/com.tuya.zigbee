'use strict';
const {SensorBase } = require('../../lib/devices/HybridSensorBase');

class AirQualityComprehensiveDevice extends SensorBase {
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
    // Only configure ZCL attribute reporting if device supports ZCL clusters
    // TS0601 devices use Tuya DP protocol and do NOT support ZCL attribute reporting
    const isTuyaDP = this.getSetting('zb_model_id')?.startsWith('TS0601') || 
                     this.getSetting('zb_manufacturer_name')?.startsWith('_TZE');
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

    // Call super.onNodeInit FIRST to ensure base class initialization
    await super.onNodeInit({ zclNode });
    
    // Register flow card triggers with try-catch to prevent crashes
    try {
      const triggerCard = this.homey.flow.getDeviceTriggerCard('air_quality_comprehensive_measure_co2_high');
      if (triggerCard) {
        this._triggerCO2High = triggerCard;
      }
    } catch (err) {
      this.log('[AIR-QUALITY] ⚠️ Flow card not found (may not be registered):', err.message);
    }
    // Prevents false low-battery alerts (e.g. _TZE200_8ygsuhe1 Smart Airbox is USB-powered)
    if (this.mainsPowered && this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
      this.log('[AIR-QUALITY] 🔌 Mains-powered: removed measure_battery');
    }

    // v5.11.15: Ensure VOC and HCHO capabilities are added for devices that report them
    // Only add capabilities if device actually reports them via DP
    // DP 21 = VOC, DP 22 = Formaldehyde - check if device has these DPs
    const dpMap = this.dpMappings || {};
    if (dpMap[21]) {
      if (!this.hasCapability('measure_voc')) {
        await this.addCapability('measure_voc').catch(() => {});
        this.log('[AIR-QUALITY] ➕ Added measure_voc capability');
      }
    }
    if (dpMap[22]) {
      if (!this.hasCapability('measure_formaldehyde')) {
        await this.addCapability('measure_formaldehyde').catch(() => {});
        this.log('[AIR-QUALITY] ➕ Added measure_formaldehyde capability');
      }
    }

    this.log('[AIR-QUALITY] ✅ Ready');
  }


  async onDeleted() {
    this.log('[AIR-QUALITY] 🗑️ Device deleted, cleaning up');
    // Clean up all event listeners to prevent memory leaks
    this.removeAllListeners(); if (this._batteryHandler) { this._batteryHandler.destroy(); };
    // Clean up any intervals/timeouts
    if (this._batteryPollInterval) {
      clearInterval(this._batteryPollInterval);
      this._batteryPollInterval = null;
    }
  }
}
module.exports = AirQualityComprehensiveDevice;
