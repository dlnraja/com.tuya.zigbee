'use strict';
const { safeDivide, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { AirQualityInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * 
 *       AIR QUALITY CO2 SENSOR - v5.5.317 INTELLIGENT INFERENCE                
 * 
 *    v5.5.317: Cross-validates CO2/VOC readings for accuracy                  
 *   UnifiedSensorBase handles: Tuya DP, battery                                 
 *   This class: dpMappings + ZCL temp/humidity listeners (specific to CO2)     
 *   DPs: 1,2,14,15,18,19,21-23 | ZCL: 1026,1029,1,EF00                        
 *   Variants: _TZE200_ywagc4rj, _TZE200_zl1kmjqx                               
 * 
 */
class AirQualityCO2Device extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_pm25', 'measure_voc', 'measure_formaldehyde', 'measure_battery'];
  }

  get dpMappings() {
    return {
      // v5.5.317: CO2 with inference validation
      2: {
        capability: 'measure_co2',
        divisor: 1,
        transform: (v) => this._validateCO2(v)
      },
      // v5.11.26: DP20=PM2.5 (Z2M _TZE200_8ygsuhe1, #1229 eeckelaertyannick fix)
      20: { capability: 'measure_pm25', divisor: 1 },
      // v5.11.26: DP21=VOC per Z2M (was incorrectly mapped to CO2)
      21: {
        capability: 'measure_voc',
        divisor: 1,
        transform: (v) => this._trackVOC(v)
      },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_humidity', divisor: 10 },
      // v5.5.317: VOC with inference tracking
      // v5.11.26: DP22=HCHO per Z2M (was incorrectly mapped to VOC)
      22: { capability: 'measure_formaldehyde', divisor: 100 },
      14: { capability: 'measure_battery', divisor: 1 },
      15: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      1: { capability: 'alarm_generic', transform: (v) => v === true || v === 1 }
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
    this._registerCapabilityListeners(); // rule-12a injected

    // v5.5.317: Initialize intelligent inference engines
    this._airQualityInference = new AirQualityInference(this, {
      co2Baseline: 400,           // Outdoor CO2 baseline
      vocCorrelationFactor: 0.5   // CO2/VOC correlation factor
    });
    this._batteryInference = new BatteryInference(this);

    // v5.12.2: Ensure VOC/HCHO/PM2.5 capabilities exist for devices that report them
    for (const cap of ['measure_pm25', 'measure_voc', 'measure_formaldehyde']) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
        this.log('[CO2] Added ' + cap);
      }
    }

    this.log('[CO2] v5.5.317 INTELLIGENT INFERENCE - DPs: 1,2,14,15,18,19,20-22');

    // Setup ZCL temp/humidity (specific to air quality sensors)
    await this._setupAirQualityZCL(zclNode);

    this.log('[CO2] Ready with cross-validation');
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
      this.log(`[CO2] Air Quality Index: ${aqi} (CO2: ${validatedCO2}ppm)`);
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
        temp.on('attr.measuredValue', (v) => {
          const t = v / 100;
          if (t >= -40 && t <= 80) {
            this._safeSetCapability('measure_temperature', t).catch(() => {});
          } else {
            this.log('[CO2] ZCL temp rejected:', t);
          }
        });
      }

      const hum = ep1.clusters?.msRelativeHumidity;
      if (hum?.on) {
        hum.on('attr.measuredValue', (v) => {
          const h = v / 100;
          if (h >= 0 && h <= 100) {
            this._safeSetCapability('measure_humidity', h).catch(() => {});
          } else {
            this.log('[CO2] ZCL hum rejected:', h);
          }
        });
      }
    } catch (e) { /* ignore */ }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = AirQualityCO2Device;
