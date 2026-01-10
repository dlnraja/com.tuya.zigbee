'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');
const { AirQualityInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      AIR QUALITY CO2 SENSOR - v5.5.317 INTELLIGENT INFERENCE                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🧠 v5.5.317: Cross-validates CO2/VOC readings for accuracy                  ║
 * ║  HybridSensorBase handles: Tuya DP, battery                                 ║
 * ║  This class: dpMappings + ZCL temp/humidity listeners (specific to CO2)     ║
 * ║  DPs: 1,2,14,15,18,19,21-23 | ZCL: 1026,1029,1,EF00                        ║
 * ║  Variants: _TZE200_ywagc4rj, _TZE200_zl1kmjqx                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class AirQualityCO2Device extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  get dpMappings() {
    return {
      // v5.5.317: CO2 with inference validation
      2: {
        capability: 'measure_co2',
        divisor: 1,
        transform: (v) => this._validateCO2(v)
      },
      21: {
        capability: 'measure_co2',
        divisor: 1,
        transform: (v) => this._validateCO2(v)
      },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_humidity', divisor: 10 },
      // v5.5.317: VOC with inference tracking
      22: {
        capability: 'measure_voc',
        divisor: 100,
        transform: (v) => this._trackVOC(v)
      },
      23: {
        capability: 'measure_voc',
        divisor: 100,
        transform: (v) => this._trackVOC(v)
      },
      14: { capability: 'measure_battery', divisor: 1 },
      15: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      1: { capability: 'alarm_generic', transform: (v) => v === true || v === 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.5.317: Initialize intelligent inference engines
    this._airQualityInference = new AirQualityInference(this, {
      co2Baseline: 400,           // Outdoor CO2 baseline
      vocCorrelationFactor: 0.5   // CO2/VOC correlation factor
    });
    this._batteryInference = new BatteryInference(this);

    this.log('[CO2] v5.5.317 INTELLIGENT INFERENCE - DPs: 1,2,14,15,18,19,21-23');

    // Setup ZCL temp/humidity (specific to air quality sensors)
    await this._setupAirQualityZCL(zclNode);

    this.log('[CO2] ✅ Ready with cross-validation');
  }

  /**
   * v5.5.317: Validate CO2 with inference engine
   */
  _validateCO2(rawCO2) {
    if (!this._airQualityInference) return rawCO2;

    const vocValue = this.getCapabilityValue('measure_voc');
    const validatedCO2 = this._airQualityInference.validateCO2(rawCO2, vocValue);

    // Calculate and log AQI
    const aqi = this._airQualityInference.calculateAQI();
    if (aqi !== null) {
      this.log(`[CO2] 🌬️ Air Quality Index: ${aqi} (CO2: ${validatedCO2}ppm)`);
    }

    return validatedCO2;
  }

  /**
   * v5.5.317: Track VOC for cross-validation
   */
  _trackVOC(vocValue) {
    if (this._airQualityInference) {
      this._airQualityInference.updateVOC(vocValue);
    }
    return vocValue;
  }

  async _setupAirQualityZCL(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    try {
      const temp = ep1.clusters?.msTemperatureMeasurement;
      if (temp?.on) {
        temp.on('attr.measuredValue', (v) => this.setCapabilityValue('measure_temperature', parseFloat(v) / 100).catch(() => { }));
      }
      const hum = ep1.clusters?.msRelativeHumidity;
      if (hum?.on) {
        hum.on('attr.measuredValue', (v) => this.setCapabilityValue('measure_humidity', parseFloat(v) / 100).catch(() => { }));
      }
    } catch (e) { /* ignore */ }
  }
}

module.exports = AirQualityCO2Device;
