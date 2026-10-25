'use strict';
const { SensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { AirQualityInference, BatteryInference } = require('../../lib/IntelligentSensorInference');
const { isMainsCo2Mfr } = require('../../lib/helpers/batteryPowerSource');
const SDK3BestPractices = require('../../lib/SDK3BestPractices');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      AIR QUALITY CO2 SENSOR - v5.5.317 INTELLIGENT INFERENCE                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🧠 v5.5.317: Cross-validates CO2/VOC readings for accuracy                  ║
 * ║ SensorBase handles: Tuya DP, battery                                 ║
 * ║  This class: dpMappings + ZCL temp/humidity listeners (specific to CO2)     ║
 * ║  DPs: 1,2,14,15,18,19,21-23 | ZCL: 1026,1029,1,EF00                        ║
 * ║  Variants: _TZE200_ywagc4rj, _TZE200_zl1kmjqx                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
/**
 * WHY(P3051): ZHA tuya_co.py tuya_air_quality_temperature_converter — DP18 is a 4-byte
 * struct [field_1 (2 bytes), temperature int16 BE (2 bytes)] in tenths of degC.
 * Accepts a Buffer or the 32-bit number the DP parser builds from it.
 */
function decodeOgkdpgy2Temperature(v) {
  let raw = null;
  if (Buffer.isBuffer(v)) {
    if (v.length >= 4) {raw = v.readInt16BE(2);}
    else if (v.length === 2) {raw = v.readInt16BE(0);}
  } else if (typeof v === 'number' && Number.isFinite(v)) {
    raw = ((v & 0xffff) << 16) >> 16;
  }
  if (raw === null) {return null;}
  const c = raw / 10;
  return c >= -40 && c <= 85 ? c : null;
}

class AirQualityCO2Device extends SensorBase {

  get mainsPowered() {
    // WHY(P2296): Homey battery-status — mains NDIR CO2 must not show measure/alarm_battery
    const mfr = (this.getManufacturerName() || this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
    if (isMainsCo2Mfr(mfr)) {return true;}
    return false;
  }

  _isOgkdpgy2Co2Only() {
    return (this.getManufacturerName() || '').toLowerCase().includes('ogkdpgy2');
  }

  _isTze204Ogkdpgy2() {
    const mfr = String(this.getManufacturerName?.() || this.getSetting?.('zb_manufacturer_name') || '').trim().toLowerCase();
    const pid = String(this.getSetting?.('zb_model_id') || 'TS0601').trim().toUpperCase();
    return mfr === '_tze204_ogkdpgy2' && pid === 'TS0601';
  }

  _learnCo2Climate(cap, value) {
    if (value === null || value === undefined || Number.isNaN(value)) {return null;}
    try {
      const learned = this.getStoreValue?.('p3051_co2_climate_caps') || [];
      if (!learned.includes(cap)) {
        this.setStoreValue?.('p3051_co2_climate_caps', [...learned, cap])?.catch?.(() => {});
      }
    } catch (_e) { /* soft */ }
    return value;
  }

  _isCo2OnlyMains() {
    const mfr = (this.getManufacturerName() || '').toLowerCase();
    return /ogkdpgy2|3ejwxpmu/i.test(mfr);
  }

  get sensorCapabilities() {
    if (this._isCo2OnlyMains()) {
      return ['measure_co2'];
    }
    return ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_pm25', 'measure_voc', 'measure_formaldehyde', 'measure_battery'];
  }

  get dpMappings() {
    const mfr = (
      this.getManufacturerName?.()
      || this.getSetting?.('zb_manufacturer_name')
      || ''
    ).toUpperCase();
    // WHY(P2538): Z2M TS0601_airbox / PM2.5_airbox — never invent climate DPs
    const isAirboxZ2m = /8B9ZPAAV|IT9UTKRO/.test(mfr);

    // WHY(P2291/P2296): Z2M ogkdpgy2/3ejwxpmu NDIR CO2 — DP2 only, mains router
    if (this._isCo2OnlyMains()) {
      const map = {
        2: {
          capability: 'measure_co2',
          divisor: 1,
          transform: (v) => this._validateCO2(v),
        },
      };
      // WHY(P3051): ZHA tuya_co.py `_TZE204_ogkdpgy2`|TS0601 also decodes DP18 temperature
      // (4-byte struct, int16 in bytes 2..3, tenths of degC) and DP19 humidity (/10).
      // Z2M lists CO2 only, so both stay optional: the capability is added on the first
      // real report and kept afterwards (store flag), never at pairing.
      if (this._isTze204Ogkdpgy2()) {
        map[18] = {
          capability: 'measure_temperature',
          dynamicAdd: true,
          transform: (v) => this._learnCo2Climate('measure_temperature', decodeOgkdpgy2Temperature(v)),
        };
        map[19] = {
          capability: 'measure_humidity',
          dynamicAdd: true,
          divisor: 10,
          transform: (v) => this._learnCo2Climate('measure_humidity', typeof v === 'number' && v >= 0 && v <= 100 ? v : null),
        };
      }
      return map;
    }

    // P2538: Z2M meta.tuyaDatapoints for _TZE284_8b9zpaav / _TZE284_it9utkro
    // Contre quoi: old DP1–4 layout (CO2/HCHO/temp/humidity) — wrong vs herdsman
    if (isAirboxZ2m) {
      return {
        2: { capability: 'measure_co2', divisor: 1, transform: (v) => this._validateCO2(v) },
        18: { capability: 'measure_temperature', smartDivisor: true },
        19: { capability: 'measure_humidity', smartDivisor: true },
        21: {
          capability: 'measure_voc',
          divisor: 100,
          transform: (v) => this._trackVOC(v),
        },
        22: { capability: 'measure_formaldehyde', smartDivisor: true },
      };
    }

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
      18: { capability: 'measure_temperature', smartDivisor: true },
      19: { capability: 'measure_humidity', smartDivisor: true },
      // v5.5.317: VOC with inference tracking
      // v5.11.26: DP22=HCHO per Z2M (was incorrectly mapped to VOC)
      22: { capability: 'measure_formaldehyde', smartDivisor: true },
      // WHY(P2296): Homey SDK — prefer measure_battery only; DP15 low-battery maps to % floor, not alarm_battery
      14: { capability: 'measure_battery', divisor: 1 },
      15: {
        capability: 'measure_battery',
        transform: (v) => {
          // battery_state enum 0/1/2 → keep existing % or map low→10
          if (v === 1 || v === 'low' || v === 2) {return 10;}
          if (v === 0 || v === 'high') {return this.getCapabilityValue('measure_battery') ?? 100;}
          return null;
        },
      },
      1: { capability: 'alarm_generic', transform: (v) => v === true || v === 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });

      // WHY(P2296): Homey apps.developer — never both measure_battery + alarm_battery;
      // mains CO2 strips both; battery variants keep measure_battery only.
      await SDK3BestPractices.ensureBatteryBestPractices(this).catch(() => {});
      if (this.mainsPowered) {
        this.log('[CO2] Mains powered variant — pruning battery capabilities');
        for (const cap of ['measure_battery', 'alarm_battery']) {
          if (this.hasCapability(cap)) {await this.removeCapability(cap).catch(() => {});}
        }
      } else if (this.hasCapability('alarm_battery') && this.hasCapability('measure_battery')) {
        await this.removeCapability('alarm_battery').catch(() => {});
      }

      // WHY(P2291/P2296): ogkdpgy2/3ejwxpmu report CO2 only — strip unused compose caps
      if (this._isCo2OnlyMains()) {
        // WHY(P3051): keep temperature/humidity once the device proved it reports them (ZHA DP18/19)
        const learnedClimate = this.getStoreValue?.('p3051_co2_climate_caps') || [];
        for (const cap of ['measure_temperature', 'measure_humidity', 'measure_pm25', 'measure_voc', 'measure_formaldehyde', 'alarm_generic', 'measure_battery', 'alarm_battery']) {
          if (learnedClimate.includes(cap)) {continue;}
          if (this.hasCapability(cap)) {
            await this.removeCapability(cap).catch(() => {});
          }
        }
      }

      // --- Attribute Reporting Configuration ---
      if (!this._isCo2OnlyMains() && !this.mainsPowered) {
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
      }

      // v5.5.317: Initialize intelligent inference engines
      this._airQualityInference = new AirQualityInference(this, {
        co2Baseline: 400,           // Outdoor CO2 baseline
        vocCorrelationFactor: 0.5   // CO2/VOC correlation factor
      });
      if (!this.mainsPowered) {
        this._batteryInference = new BatteryInference(this);
      }

      // v5.12.2: Ensure VOC/HCHO/PM2.5 capabilities exist for multi-gas devices only
      if (!this._isCo2OnlyMains()) {
        for (const cap of ['measure_pm25', 'measure_voc', 'measure_formaldehyde']) {
          if (!this.hasCapability(cap)) {
            await this.addCapability(cap).catch(() => { });
            this.log(`[CO2] Added ${cap}`);
          }
        }
      }

      this.log('[CO2] v5.5.317 INTELLIGENT INFERENCE - DPs: 1,2,14,15,18,19,20-22');
      
      // Setup ZCL temp/humidity (specific to air quality sensors)
      if (!this._isCo2OnlyMains()) {
        await this._setupAirQualityZCL(zclNode);
      }
      this.log('[CO2] ✅ Ready with cross-validation | mains=', this.mainsPowered);
    }, 'onNodeInit');
  }

  /**
   * v5.5.317: Validate CO2 with inference engine
   */
  _validateCO2(rawCO2) {
    if (!this._airQualityInference) {return rawCO2;}

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
    if (!ep1?.clusters) {return;}

    // WHY(P2540): complementary ZCL RX alongside EF00 DP — never replace DP map.
    // Contre quoi: airbox/ZHA siblings that expose 0x040d CO2 / VOC / HCHO / PM2.5 while EF00 also runs.
    const commit = (cap, value) => {
      if (value === null || value === undefined || Number.isNaN(value)) {return;}
      if (!this.hasCapability(cap)) {return;}
      if (typeof this.confirmInbound === 'function') {
        this.confirmInbound(cap, value, 'zcl').catch(() => {});
        return;
      }
      this.safeSetCapabilityValue(cap, value, { source: 'zcl' }).catch(() => {});
    };

    const listenMeasured = (clusterNames, cap, transform) => {
      for (const name of clusterNames) {
        const cluster = ep1.clusters[name];
        if (!cluster) {continue;}
        try {
          cluster.on('attr.measuredValue', (v) => {
            try {
              commit(cap, transform(v));
            } catch (_e) { /* never break RX */ }
          });
          this.log(`[CO2] ZCL complementary listen ${name} → ${cap}`);
        } catch (e) {
          this.log(`[CO2] ZCL listen skip ${name}:`, e.message);
        }
      }
    };

    try {
      listenMeasured(
        ['msTemperatureMeasurement', 'temperatureMeasurement'],
        'measure_temperature',
        (v) => {
          const t = parseFloat(v) / 100;
          return t >= -40 && t <= 80 ? t : null;
        }
      );
      listenMeasured(
        ['msRelativeHumidity', 'relativeHumidity'],
        'measure_humidity',
        (v) => {
          const h = parseFloat(v) / 100;
          return h >= 0 && h <= 100 ? h : null;
        }
      );
      listenMeasured(
        ['msCO2', 'carbonDioxideMeasurement', 'msCarbonDioxide'],
        'measure_co2',
        (v) => this._validateCO2(parseFloat(v))
      );
      listenMeasured(
        ['pm25Measurement', 'msFineParticle'],
        'measure_pm25',
        (v) => {
          const n = parseFloat(v);
          return n >= 0 && n <= 1000 ? n : null;
        }
      );
      listenMeasured(
        ['vocMeasurement', 'msVOC', 'msVoc'],
        'measure_voc',
        (v) => this._trackVOC(parseFloat(v))
      );
      listenMeasured(
        ['formaldehydeMeasurement', 'msFormaldehyde'],
        'measure_formaldehyde',
        (v) => {
          const n = parseFloat(v);
          // Homey often gets µg/m³ or mg×100 — soft range gate only
          if (n > 50) {return n / 100;}
          return n >= 0 && n <= 50 ? n : null;
        }
      );
    } catch (e) {
      this.error('[CO2] ZCL setup error:', e.message);
    }
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = AirQualityCO2Device;
module.exports.decodeOgkdpgy2Temperature = decodeOgkdpgy2Temperature;
