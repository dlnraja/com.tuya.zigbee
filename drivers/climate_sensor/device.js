'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');
const TuyaTimeManager = require('../../lib/TuyaTimeManager');
const TuyaDeviceClassifier = require('../../lib/TuyaDeviceClassifier');
const TuyaEpochDetector = require('../../lib/TuyaEpochDetector');
const TuyaTimeDebugProbe = require('../../lib/TuyaTimeDebugProbe');
const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
const TuyaRtcDetector = require('../../lib/TuyaRtcDetector');
const { syncDeviceTimeTuya } = require('../../lib/tuya/TuyaTimeSync');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

// ═══════════════════════════════════════════════════════════════════════════════
// v5.5.793: VALIDATION CONSTANTS - Centralized thresholds for data validation
// ═══════════════════════════════════════════════════════════════════════════════
const VALIDATION = {
  TEMP_MIN: -40,
  TEMP_MAX: 80,
  HUMIDITY_MIN: 0,
  HUMIDITY_MAX: 100,
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
  LUX_MIN: 0,
  LUX_MAX: 100000,
  HUMIDITY_AUTO_DIVISOR_THRESHOLD: 100, // If value > 100, divide by 10
};

// v5.5.793: Battery report throttling (prevents spam on frequent reports)
const BATTERY_THROTTLE_MS = 300000; // 5 minutes minimum between updates

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     CLIMATE SENSOR ULTIMATE - v5.5.317 INTELLIGENT INFERENCE                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  🧠 v5.5.317: INTELLIGENT INFERENCE ENGINE                                   ║
 * ║  - Validates temperature/humidity with cross-correlation                    ║
 * ║  - Smooths erratic readings from unstable sensors                           ║
 * ║  - Predicts battery life from discharge patterns                            ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  🔥 v5.5.190: INTELLIGENT PROTOCOL + COMPLETE DP RESEARCH                   ║
 * ║  - Auto-detect protocol: TUYA_DP_LCD, TUYA_DP, ZCL_STANDARD, HYBRID         ║
 * ║  - Full DP mappings from Z2M #26078, #19731, Blakadder, ZHA                 ║
 * ║  - Battery: DP3 (enum low/med/high) OR DP4 (×2 multiplier) OR ZCL          ║
 * ║  - Time sync: Tuya epoch (2000) for LCD, skipped for ZCL devices            ║
 * ║  - Calibration offsets for temp/humidity                                    ║
 * ║  - Wake detection + aggressive DP requests                                  ║
 * ║  - Illuminance support (DP5) for multi-sensor devices                       ║
 * ║                                                                              ║
 * ║  MANUFACTURER PROTOCOL MAP:                                                  ║
 * ║  ┌─────────────┬──────────────────────────────────────────────────────┐      ║
 * ║  │ Type        │ Protocol                                             │      ║
 * ║  ├─────────────┼──────────────────────────────────────────────────────┤      ║
 * ║  │ _TZE200_*   │ Tuya DP + cmd 0x24 (timeRequest → timeResponse)      │      ║
 * ║  │ _TZE204_*   │ Tuya DP + cmd 0x24 (similar to TZE200)               │      ║
 * ║  │ _TZE284_*   │ Tuya DP + cmd 0x24 + LCD clock (Tuya epoch 2000)     │      ║
 * ║  │ _TZ3000_*   │ ZCL standard (0x0402, 0x0405, 0x0001)                │      ║
 * ║  │ TS0201      │ ZCL standard (temperature, humidity, battery)        │      ║
 * ║  │ TS0601      │ Tuya proprietary (EF00 cluster)                      │      ║
 * ║  └─────────────┴──────────────────────────────────────────────────────┘      ║
 * ║                                                                              ║
 * ║  DP MAPPINGS (verified from Z2M TH05Z, WSD500A, RSH-TH01):                   ║
 * ║  - DP1: Temperature (÷10 = °C)                                               ║
 * ║  - DP2: Humidity (direct %)                                                  ║
 * ║  - DP4: Battery (×2, capped at 100%)                                         ║
 * ║  - DP6: Temperature alt (some _TZE204 models, ÷10)                           ║
 * ║  - DP7: Humidity alt (some _TZE204 models)                                   ║
 * ║  - DP9: Temperature unit (0=C, 1=F)                                          ║
 * ║  - DP10-13: Alarm thresholds (max/min temp/humidity)                         ║
 * ║  - DP14-15: Alarm status (NOT battery!)                                      ║
 * ║  - DP17-20: Reporting config (intervals, sensitivity)                        ║
 * ║  - DP18: Alt temperature on some firmware                                    ║
 * ║  - DP101-103: Button press / illuminance on some models                      ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ClimateSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  // v5.5.189: Try BOTH ZCL and Tuya DP for battery (maximize compatibility)
  get usesTuyaDPBattery() { return true; }
  get skipZclBatteryPolling() { return false; } // Try both!

  // v5.5.54: FORCE ACTIVE MODE - Do NOT block DP requests in passive mode
  // Climate sensors need active queries even if cluster 0xEF00 not visible
  get forceActiveTuyaMode() { return true; }

  // v5.5.54: Enable TRUE HYBRID mode - listen to BOTH ZCL AND Tuya DP
  get hybridModeEnabled() { return true; }

  /** Capabilities for climate sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.189: CALIBRATION OFFSETS (merged from climate_box_vvmbj46n)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get temperature offset from settings (for calibration)
   * @returns {number} Temperature offset in °C
   */
  get temperatureOffset() {
    const settings = this.getSettings() || {};
    // Support both naming conventions (temperature_calibration from driver.compose.json)
    return parseFloat(settings.temperature_calibration) || parseFloat(settings.temperature_offset) || 0;
  }

  /**
   * Get humidity offset from settings (for calibration)
   * @returns {number} Humidity offset in %
   */
  get humidityOffset() {
    const settings = this.getSettings() || {};
    // Support both naming conventions (humidity_calibration from driver.compose.json)
    return parseFloat(settings.humidity_calibration) || parseFloat(settings.humidity_offset) || 0;
  }

  /**
   * Apply calibration offset to temperature
   * @param {number} temp Raw temperature value
   * @returns {number} Calibrated temperature
   */
  _applyTempOffset(temp) {
    const offset = this.temperatureOffset;
    const calibrated = temp + offset;
    if (offset !== 0) {
      this.log(`[CALIBRATION] Temp: ${temp}°C + offset ${offset}°C = ${calibrated}°C`);
    }
    return calibrated;
  }

  /**
   * Apply calibration offset to humidity
   * @param {number} hum Raw humidity value
   * @returns {number} Calibrated humidity (clamped 0-100)
   */
  _applyHumOffset(hum) {
    const offset = this.humidityOffset;
    const calibrated = Math.max(0, Math.min(100, hum + offset));
    if (offset !== 0) {
      this.log(`[CALIBRATION] Humidity: ${hum}% + offset ${offset}% = ${calibrated}%`);
    }
    return calibrated;
  }

  /**
   * v5.5.190: COMPLETE DP MAPPINGS - Research from Z2M, ZHA, Blakadder
   *
   * SOURCES VERIFIED:
   * - https://github.com/Koenkk/zigbee2mqtt/issues/26078 (_TZE284_vvmbj46n TH05Z)
   * - https://github.com/Koenkk/zigbee2mqtt/issues/19731 (_TZE200_vvmbj46n TH05Z)
   * - https://zigbee.blakadder.com/Tuya_ZG227C.html (ZG227C LCD)
   * - https://www.zigbee2mqtt.io/devices/TS0201-z.html (TS0201 ZCL)
   *
   * MANUFACTURER PROTOCOL DIFFERENCES:
   * ┌────────────────┬────────────────────────────────────────────────────┐
   * │ Manufacturer   │ Protocol & Features                                │
   * ├────────────────┼────────────────────────────────────────────────────┤
   * │ _TZE284_*      │ Tuya DP + LCD display + Time sync (epoch 2000)    │
   * │ _TZE200_*      │ Tuya DP + some with LCD + Time sync               │
   * │ _TZE204_*      │ Tuya DP + enhanced features + Time sync           │
   * │ _TZ3000_*      │ ZCL standard clusters (0x0402, 0x0405, 0x0001)    │
   * │ TS0201         │ ZCL standard + calibration + measurement interval │
   * └────────────────┴────────────────────────────────────────────────────┘
   *
   * BATTERY HANDLING DIFFERENCES:
   * - _TZE284_*: DP4 with x2 multiplier (device reports 0-50 → 0-100%)
   * - _TZE200_*: DP3 (battery_state: low/medium/high) OR DP4 (raw %)
   * - _TZ3000_*: ZCL cluster 0x0001 (batteryPercentageRemaining ÷ 2)
   * - TS0201: ZCL cluster 0x0001 standard
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE DPs (multiple variants)
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'measure_temperature', divisor: 10 },    // Standard: all _TZE* devices
      6: { capability: 'measure_temperature', divisor: 10 },    // Alt: some _TZE204 models
      18: { capability: 'measure_temperature', divisor: 10 },   // Alt: ZG227C and some LCD models

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY DPs (multiple variants)
      // v5.5.792: FIX LukasT #1163 - _TZE284_1wnh8bqp needs humidity ÷10
      // Some devices report humidity as 0-1000 (÷10), others as 0-100 (direct)
      // ═══════════════════════════════════════════════════════════════════
      2: {
        capability: 'measure_humidity',
        transform: (v) => {
          // v5.5.792: Auto-detect divisor based on value range
          // If value > 100, it's likely ×10 scaled (e.g., 650 → 65.0%)
          if (v > 100) return Math.round(v / 10);
          return v;
        }
      },
      7: {
        capability: 'measure_humidity',
        transform: (v) => {
          if (v > 100) return Math.round(v / 10);
          return v;
        }
      },
      // v5.5.499: REMOVED DP103 humidity - was causing incorrect values
      // DP103 is illuminance on most devices, not humidity (forum diagnostics)

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY DPs - INTELLIGENT HANDLING
      // v5.5.190: Handle both battery% (DP4) and battery_state (DP3)
      // ═══════════════════════════════════════════════════════════════════
      3: {
        capability: 'measure_battery', transform: (v) => {
          // DP3 = battery_state enum (0=low, 1=medium, 2=high) for some _TZE200
          if (v === 0) return 10;   // low
          if (v === 1) return 50;   // medium
          if (v === 2) return 100;  // high
          return Math.min(v * 2, 100); // Fallback: treat as raw with x2
        }
      },
      4: { capability: 'measure_battery', transform: (v) => Math.min(v * 2, 100) }, // x2 multiplier

      // ═══════════════════════════════════════════════════════════════════
      // CONFIGURATION DPs - TH05Z / ZG227C LCD sensors
      // Source: Z2M #26078, #19731, Blakadder
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'temperature_unit' },     // 0=Celsius, 1=Fahrenheit
      10: { capability: null, setting: 'max_temp_alarm', divisor: 10 },  // Max temp °C/10
      11: { capability: null, setting: 'min_temp_alarm', divisor: 10 },  // Min temp °C/10
      12: { capability: 'measure_luminance', divisor: 1 },       // v5.5.783: DP12=Lux for multi-sensors
      13: { capability: null, setting: 'min_humidity_alarm' },  // Min humidity %
      14: { capability: null, setting: 'temp_alarm_status' },   // 0=cancel, 1=lower, 2=upper
      15: { capability: null, setting: 'humidity_alarm_status' }, // 0=cancel, 1=lower, 2=upper
      17: { capability: null, setting: 'temp_report_interval' },  // 1-120 minutes
      18: { capability: null, setting: 'humidity_report_interval' }, // 1-120 minutes (DP18)
      19: { capability: null, setting: 'temp_sensitivity', divisor: 10 },  // 0.3-1.0°C
      20: { capability: null, setting: 'humidity_sensitivity' }, // 3-10%

      // ═══════════════════════════════════════════════════════════════════
      // ILLUMINANCE (some models like _TZE200_locansqn)
      // ═══════════════════════════════════════════════════════════════════
      5: { capability: 'measure_luminance', divisor: 1 },       // Lux (some models)

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY ALTERNATE DPs (HOBEIAN and some other sensors)
      // v5.5.710: Fix for HOBEIAN temp/humidity sensors using DP101 for battery
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: 'measure_battery', transform: (v) => Math.min(Math.max(v, 0), 100) },
      102: { capability: 'measure_battery', transform: (v) => Math.min(Math.max(v, 0), 100) },
    };
  }

  /**
   * v5.5.190: INTELLIGENT PROTOCOL DETECTION
   * Determines best protocol based on manufacturerName
   */
  get deviceProtocol() {
    const mfr = (this._manufacturerName || '').toLowerCase();

    if (mfr.startsWith('_tze284')) return 'TUYA_DP_LCD';      // LCD with Tuya epoch
    if (mfr.startsWith('_tze200')) return 'TUYA_DP';          // Standard Tuya DP
    if (mfr.startsWith('_tze204')) return 'TUYA_DP_ENHANCED'; // Enhanced Tuya DP
    if (mfr.startsWith('_tz3000')) return 'ZCL_STANDARD';     // Pure ZCL
    if (mfr.startsWith('_tz3210')) return 'ZCL_STANDARD';     // Pure ZCL

    // Check modelId for protocol hints
    const modelId = this._modelId || '';
    if (modelId === 'TS0201') return 'ZCL_STANDARD';
    if (modelId === 'TS0601') return 'TUYA_DP';

    return 'HYBRID'; // Default: try both
  }

  /**
   * v5.5.190: Check if device needs Tuya epoch (2000) for time sync
   */
  get needsTuyaEpoch() {
    const mfr = (this._manufacturerName || '').toLowerCase();
    // v5.8.74: ALL _TZE* devices need Tuya epoch (2000), not just _TZE284
    // Z2M issue #30054: wrong epoch (1970 vs 2000) causes wrong time on ALL TS0601
    return mfr.startsWith('_tze200') ||
      mfr.startsWith('_tze204') ||
      mfr.startsWith('_tze284') ||
      mfr.includes('vvmbj46n') ||
      mfr.includes('aao6qtcs') ||
      mfr.includes('znph9215') ||
      mfr.includes('qoy0ekbd');
  }

  /**
   * v5.5.207: Check if this is a LCD climate device that needs FORCED time sync
   * These devices are PASSIVE and will never display time unless we push sync
   */
  isLCDClimateDevice() {
    const mfr = (this._manufacturerName || '').toLowerCase();
    const modelId = this._modelId || '';

    // _TZE284_ series are LCD climate sensors with RTC displays
    if (mfr.startsWith('_tze284_')) return true;

    // Known LCD climate sensor manufacturer IDs
    const lcdManufacturers = [
      '_tze284_vvmbj46n',  // TH05Z LCD climate sensor (MAIN TARGET)
      '_tze284_aao6qtcs',  // Similar LCD model
      '_tze284_znph9215',  // Another LCD variant
      '_tze284_qoy0ekbd',  // LCD climate sensor
      '_tze200_vvmbj46n',  // Some TZE200 also have LCD
    ];

    // Check if manufacturer matches known LCD devices
    for (const lcdMfr of lcdManufacturers) {
      if (mfr.includes(lcdMfr)) return true;
    }

    // TS0601 with LCD indicators (some have LCD displays)
    if (modelId === 'TS0601' && mfr.startsWith('_tze284_')) return true;

    return false;
  }

  /**
   * v5.5.190: Check if device uses battery_state enum (DP3) vs battery% (DP4)
   */
  get usesBatteryStateEnum() {
    const mfr = (this._manufacturerName || '').toLowerCase();
    // Some _TZE200 devices use DP3 with enum (low/medium/high)
    return mfr.includes('_tze200_vvmbj46n'); // TH05Z original uses DP3
  }

  /**
   * v5.5.82: ENHANCED ZCL cluster handlers
   *
   * CRITICAL FOR TZE284 DEVICES:
   * TZE284 devices like _TZE284_vvmbj46n declare ZCL standard clusters:
   * - temperatureMeasurement
   * - relativeHumidity
   * - powerConfiguration
   *
   * These clusters MAY report data via ZCL even if Tuya DP doesn't work!
   */
  get clusterHandlers() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE - ZCL standard cluster (0x0402)
      // Value is in 0.01°C units, divide by 100
      // ═══════════════════════════════════════════════════════════════════
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== -32768) {
            let rawTemp = data.measuredValue / 100;
            
            // v5.5.793: Validate range before processing
            if (rawTemp < VALIDATION.TEMP_MIN || rawTemp > VALIDATION.TEMP_MAX) {
              this.log(`[ZCL] ⚠️ Temperature out of range: ${rawTemp}°C`);
              return;
            }
            
            // v5.5.317: Validate with inference engine (smooths erratic readings)
            if (this._climateInference) {
              rawTemp = this._climateInference.validateTemperature(rawTemp);
              if (rawTemp === null) {
                this.log(`[ZCL] ⚠️ Temperature rejected by inference engine`);
                return;
              }
            }
            // v5.5.189: Apply calibration offset
            const temp = this._applyTempOffset(rawTemp);
            this.log(`[ZCL] 🌡️ Temperature: ${temp}°C (confidence: ${this._climateInference?.getConfidence() || 'N/A'}%)`);
            this._registerZclData?.(); // v5.5.108: Track for learning
            this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
          }
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY - ZCL standard cluster (0x0405)
      // Value is in 0.01% units, divide by 100
      // ═══════════════════════════════════════════════════════════════════
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            let rawHum = data.measuredValue / 100;
            // v5.5.317: Validate with inference engine (smooths erratic readings)
            if (this._climateInference) {
              rawHum = this._climateInference.validateHumidity(rawHum);
              if (rawHum === null) {
                this.log(`[ZCL] ⚠️ Humidity rejected by inference engine`);
                return;
              }
              // Check correlation between temp and humidity
              if (!this._climateInference.checkCorrelation()) {
                this.log(`[ZCL] ⚠️ Temp/Humidity correlation suspicious - sensor may be faulty`);
              }
            }
            // v5.5.189: Apply calibration offset
            const humidity = this._applyHumOffset(rawHum);
            this.log(`[ZCL] 💧 Humidity: ${humidity}% (confidence: ${this._climateInference?.getConfidence() || 'N/A'}%)`);
            this._registerZclData?.(); // v5.5.108: Track for learning
            this.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(() => { });
          }
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - ZCL standard cluster (0x0001)
      // ═══════════════════════════════════════════════════════════════════
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== 255) {
            // v5.5.793: Battery throttling to prevent spam
            const now = Date.now();
            if (this._lastBatteryReportTime && (now - this._lastBatteryReportTime) < BATTERY_THROTTLE_MS) {
              return; // Skip - too soon since last report
            }
            this._lastBatteryReportTime = now;
            
            let battery = Math.round(data.batteryPercentageRemaining / 2);
            battery = Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, battery));
            
            // v5.5.793: Validate with inference engine
            if (this._batteryInference) {
              battery = this._batteryInference.validateBattery(battery) ?? battery;
            }
            
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this._registerZclData?.(); // v5.5.108: Track for learning
            this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
          }
        }
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION - v5.5.180 SIMPLIFIED
  // ═══════════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    this.log('║  CLIMATE SENSOR ULTIMATE - v5.5.317 INTELLIGENT INFERENCE                   ║');
    this.log('║  ZCL + Tuya DP + Battery + Time sync + Validation + Cross-correlation      ║');
    this.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    this.log('');

    // Store zclNode for time sync
    this._zclNode = zclNode;

    // v5.5.317: Initialize intelligent inference engines
    this._climateInference = new ClimateInference(this, {
      maxTempJump: 5,       // Max 5°C change per reading
      maxHumidityJump: 15,  // Max 15% humidity change per reading
    });
    this._batteryInference = new BatteryInference(this);

    // Call parent initialization (HybridSensorBase sets up ALL listeners)
    await super.onNodeInit({ zclNode });

    // ═══════════════════════════════════════════════════════════════════════
    // Read device info from basic cluster
    // ═══════════════════════════════════════════════════════════════════════
    let mfr = 'unknown';
    let modelId = 'unknown';

    try {
      const endpoint = zclNode?.endpoints?.[1];
      const basicCluster = endpoint?.clusters?.basic;
      if (basicCluster && typeof basicCluster.readAttributes === 'function') {
        const attrs = await basicCluster.readAttributes(['manufacturerName', 'modelId']).catch(() => ({}));
        mfr = attrs.manufacturerName || 'unknown';
        modelId = attrs.modelId || 'unknown';
      }
    } catch (e) {
      this.log('[CLIMATE] Basic cluster read failed:', e.message);
    }

    // Fallback to settings
    if (mfr === 'unknown') {
      const settings = this.getSettings() || {};
      mfr = settings.zb_manufacturer_name || settings.zb_manufacturerName || 'unknown';
      modelId = settings.zb_model_id || settings.zb_modelId || 'unknown';
    }

    this._manufacturerName = mfr;
    this._modelId = modelId;

    // v5.5.190: Log device protocol detection
    const protocol = this.deviceProtocol;
    const needsEpoch = this.needsTuyaEpoch;
    const batteryEnum = this.usesBatteryStateEnum;

    this.log(`[CLIMATE] Device: ${mfr} / ${modelId}`);
    this.log(`[CLIMATE] Protocol: ${protocol} | Tuya Epoch: ${needsEpoch} | Battery Enum: ${batteryEnum}`);

    // ═══════════════════════════════════════════════════════════════════════
    // Detect available clusters
    // ═══════════════════════════════════════════════════════════════════════
    const ep1 = zclNode?.endpoints?.[1];
    const clusters = ep1?.clusters || {};

    this._hasTuyaCluster = !!(
      clusters.tuya || clusters.tuyaSpecific ||
      clusters[0xEF00] || clusters['61184']
    );

    this.log(`[CLIMATE] Tuya cluster: ${this._hasTuyaCluster ? '✅' : '❌'}`);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.208: ZCL TIME CLUSTER SYNC - CORRECT METHOD FOR TS0601 RTC DEVICES
    // Using ZCL Time Cluster 0x000A with Zigbee Epoch 2000 (NOT EF00!)
    // ═══════════════════════════════════════════════════════════════════════

    // DIAGNOSTIC FORCÉ pour _TZE284_vvmbj46n
    const diagnosticMfr = this._manufacturerName || '';
    const diagnosticModelId = this._modelId || '';
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - Device: ${diagnosticMfr} / ${diagnosticModelId}`);
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - Protocol: ${typeof this.getProtocol === 'function' ? this.getProtocol() : 'N/A'}`);
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - isLCDClimateDevice: ${typeof this.isLCDClimateDevice === 'function' ? this.isLCDClimateDevice() : 'N/A'}`);
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - needsTuyaEpoch: ${this.needsTuyaEpoch || 'N/A'}`);

    // Détection RTC via outCluster 0x000A (méthode fiable)
    const rtcDetection = TuyaRtcDetector.hasRtc(this, { useHeuristics: true });
    this.log(`[CLIMATE] 🔍 RTC Detection: ${JSON.stringify(rtcDetection)}`);

    if (rtcDetection.hasRtc) {
      this.log('[CLIMATE] 🔥 RTC DEVICE DETECTED - Setting up ZCL Time Cluster sync');

      // ─────────────────────────────────────────────────────────────────────
      // ZCL TIME SYNC: Production-ready avec bind + writeAttributes + throttle
      // ─────────────────────────────────────────────────────────────────────
      this.zigbeeTimeSync = new ZigbeeTimeSync(this, {
        throttleMs: 24 * 60 * 60 * 1000, // 24h throttle (battery safe)
        maxRetries: 3,
        retryDelayMs: 2000
      });

      // One-shot sync immediate
      const syncResult = await this.zigbeeTimeSync.sync({ force: true });
      if (syncResult.success) {
        this.log('[CLIMATE] ✅ Initial ZCL Time sync successful - LCD should show correct time!');
      } else {
        this.log(`[CLIMATE] ⚠️ Initial sync failed: ${syncResult.reason}`);
      }

      // Daily sync (ultra battery-safe)
      this._dailyZclSyncInterval = this.homey.setInterval(async () => {
        this.log('[CLIMATE] 🕐 Daily ZCL Time sync...');
        const result = await this.zigbeeTimeSync.sync();
        this.log(`[CLIMATE] Daily sync result: ${result.success ? 'success' : result.reason}`);
      }, 24 * 60 * 60 * 1000);

      // ─────────────────────────────────────────────────────────────────────
      // DEBUG MODE: Test toutes les méthodes ZCL (si activé)
      // ─────────────────────────────────────────────────────────────────────
      if (this.getSettings().zigbee_time_debug === true) {
        this.log('[CLIMATE] 🧪 ZCL DEBUG MODE: Testing all Time cluster methods...');
        const debugResults = await this.zigbeeTimeSync.debugSync();
        this.log('[CLIMATE] 🧪 Debug complete:', JSON.stringify(debugResults, null, 2));
      }

      this.log('[CLIMATE] 🎯 ZCL Time Cluster sync setup complete (method: bind + writeAttributes)');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.469: DUAL TIME SYNC FOR LCD CLIMATE SENSORS
    // Some LCD devices need Tuya EF00 time sync IN ADDITION to ZCL Time Cluster
    // v5.5.469: Removed _hasTuyaCluster check - device receives EF00 frames even
    // when cluster object isn't exposed (passive mode). Try sync anyway!
    // ═══════════════════════════════════════════════════════════════════════
    if (this.isLCDClimateDevice()) {
      this.log('[CLIMATE] 🔥 LCD DEVICE - Sending DUAL time sync (ZCL + Tuya EF00)...');

      // v5.5.375: AGGRESSIVE LCD TIME SYNC - Send multiple times to ensure delivery
      // LCD devices are passive and may miss the first sync attempts
      const lcdSyncDelays = [3000, 10000, 30000, 60000, 120000]; // 3s, 10s, 30s, 1m, 2m
      lcdSyncDelays.forEach((delay, index) => {
        setTimeout(async () => {
          try {
            this.log(`[CLIMATE] 🔥 LCD time sync attempt ${index + 1}/${lcdSyncDelays.length}...`);
            await this._sendForcedTimeSync();
            this.log(`[CLIMATE] 🔥 ✅ LCD time sync attempt ${index + 1} sent`);
          } catch (e) {
            this.log(`[CLIMATE] 🔥 ⚠️ LCD sync attempt ${index + 1} failed:`, e.message);
          }
        }, delay);
      });

      // Schedule hourly Tuya EF00 sync for LCD devices (in addition to ZCL daily)
      this._hourlyLcdSyncInterval = this.homey.setInterval(async () => {
        this.log('[CLIMATE] 🔥 Hourly LCD Tuya EF00 time sync...');
        await this._sendForcedTimeSync().catch(e =>
          this.log('[CLIMATE] LCD sync failed:', e.message)
        );
      }, 60 * 60 * 1000); // 1 hour
    }

    // Legacy time sync for non-RTC devices (keep existing behavior)
    if (!TuyaDeviceClassifier.hasRtcScreen(this) && !this.isLCDClimateDevice()) {
      this._hourlySyncInterval = this.homey.setInterval(async () => {
        this.log('[CLIMATE] 🕐 Hourly time sync (non-RTC device)...');
        await this._sendTimeSync().catch(e => this.log('[CLIMATE] Time sync failed:', e.message));
      }, 60 * 60 * 1000); // 1 hour
    }

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.188: EXPLICIT ZCL CLUSTER SETUP (like v5.5.165)
    // Bind + configure reporting for temperature, humidity, battery
    // ═══════════════════════════════════════════════════════════════════════
    await this._setupExplicitZCLClusters(zclNode);

    // DIAGNOSTIC FORCÉ - Vérifier état clusters et données
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - Available clusters: ${JSON.stringify(Object.keys(clusters || {}))}`);
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - Available capabilities: ${JSON.stringify(this.getCapabilities())}`);
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - Current values: temp=${this.getCapabilityValue('measure_temperature')}, hum=${this.getCapabilityValue('measure_humidity')}, bat=${this.getCapabilityValue('measure_battery')}`);
    this.log(`[CLIMATE] 🔍 DIAGNOSTIC - _hasTuyaCluster: ${this._hasTuyaCluster}`);

    // ═══════════════════════════════════════════════════════════════════════
    // Send Tuya Magic Packet to wake up device
    // ═══════════════════════════════════════════════════════════════════════
    if (this._hasTuyaCluster) {
      this.log('[CLIMATE] 🔮 Sending Tuya Magic Packet...');
      await this._sendTuyaMagicPacket(zclNode).catch(e => {
        this.log('[CLIMATE] Magic packet failed:', e.message);
      });
    } else {
      this.log('[CLIMATE] ❌ NO TUYA CLUSTER - Device might not be pairing correctly');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Schedule initial DP requests for sleepy device
    // ═══════════════════════════════════════════════════════════════════════
    this._scheduleInitialDPRequests();

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.188: Read ZCL attributes immediately (battery, temp, humidity)
    // ═══════════════════════════════════════════════════════════════════════
    await this._readZCLAttributesNow(zclNode);

    this.log('[CLIMATE] ✅ Climate sensor ready - INTELLIGENT v5.5.207 + FORCED LCD SYNC');
    this.log('[CLIMATE] ════════════════════════════════════════════════════════════');
    this.log('[CLIMATE] ⚠️ BATTERY DEVICE - This is a sleepy sensor!');
    this.log('[CLIMATE] ⚠️ First data may take 10-60 minutes after pairing');
    this.log('[CLIMATE] ⚠️ Device only wakes up periodically to save battery');
    this.log('[CLIMATE] ⚠️ All DP/ZCL requests sent - waiting for device to wake up');
    if (this.isLCDClimateDevice()) {
      this.log('[CLIMATE] 🔥 LCD DEVICE - FORCED time sync enabled for display');
    }
    this.log('[CLIMATE] ════════════════════════════════════════════════════════════');
    this.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME SYNC LISTENER - Respond to device time requests
  // ═══════════════════════════════════════════════════════════════════════════


  /**
   * v5.5.207: FORCED time sync for LCD climate devices that are PASSIVE
   * These devices NEVER request time and ONLY display time if we PUSH it unconditionally
   * Uses enhanced TuyaEF00Manager with multi-endpoint + double sync + extended payload
   */
  async _sendForcedTimeSync() {
    if (!this.isLCDClimateDevice()) {
      this.log('[CLIMATE] 🕐 Not a LCD device - using regular time sync');
      return await this._sendTimeSync();
    }

    try {
      const mfr = this._manufacturerName || '';
      const now = new Date();
      const settings = this.getSettings() || {};

      // v5.5.384: Read user settings for time format and timezone
      const userTimeFormat = settings.time_sync_format || 'auto';
      const userTimezone = settings.time_sync_timezone || 'auto';

      // Calculate timezone from settings or auto-detect
      let timezoneMinutes;
      if (userTimezone === 'auto') {
        timezoneMinutes = -now.getTimezoneOffset(); // JS inverted
      } else {
        const tzMap = { 'utc': 0, 'gmt+1': 60, 'gmt+2': 120, 'gmt+3': 180, 'gmt-5': -300, 'gmt-8': -480, 'gmt+8': 480 };
        timezoneMinutes = tzMap[userTimezone] ?? -now.getTimezoneOffset();
      }

      this.log('[CLIMATE] 🔥 FORCING time sync for LCD climate device');
      this.log(`[CLIMATE] 🔥 Target: ${mfr || 'unknown'} (passive LCD sensor)`);
      this.log(`[CLIMATE] 🔥 Local: ${now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      this.log(`[CLIMATE] 🔥 Format: ${userTimeFormat}, TZ: ${userTimezone} (${timezoneMinutes} min)`);

      // v5.5.440: DUAL METHOD - Try BOTH EF00 command AND DP time sync
      // Some LCD devices only respond to DP-based time, not EF00 command 0x24
      let success = false;

      // v5.8.74: Hoist to outer scope (was block-scoped in Method 2, referenced in Method 3)
      const TUYA_EPOCH_FIX = 946684800;
      const utcSecondsFix = Math.floor(Date.now() / 1000) - TUYA_EPOCH_FIX;

      // METHOD 1: EF00 command 0x24 (standard Tuya time sync)
      try {
        const result = await syncDeviceTimeTuya(this, {
          logPrefix: '[CLIMATE-FORCED-EF00]',
          useTuyaEpoch: true,
          timezoneMinutes: timezoneMinutes
        });
        if (result) {
          this.log('[CLIMATE] 🔥 ✅ EF00 time sync sent');
          success = true;
        }
      } catch (e) {
        this.log('[CLIMATE] 🔥 ⚠️ EF00 method failed:', e.message);
      }

      // METHOD 2: DP-based time sync (DP 101/102/103) - CRITICAL for some LCD devices
      // Format: UTC timestamp in seconds (Tuya epoch 2000)
      try {
        const utcSeconds = utcSecondsFix;

        this.log(`[CLIMATE] 🔥 Sending DP time sync: ${utcSeconds} (Tuya epoch)`);

        // Try multiple DPs that LCD devices use for time
        const timeDPs = [101, 102, 103, 9, 17];
        for (const dp of timeDPs) {
          try {
            await this._sendTuyaDP(dp, utcSeconds, 'value');
            this.log(`[CLIMATE] 🔥 ✅ DP${dp} time sync sent`);
            success = true;
            break; // Stop on first success
          } catch (e) {
            // Try next DP
          }
        }
      } catch (e) {
        this.log('[CLIMATE] 🔥 ⚠️ DP method failed:', e.message);
      }

      // v5.5.444: Method 3 - Raw ZCL frame bypass (for devices paired before cluster was added)
      if (!success && this.zclNode) {
        try {
          // Calculate local time with timezone offset
          const localSeconds = utcSecondsFix + (timezoneMinutes * 60);

          // v5.5.446: Build raw Tuya mcuSyncTime frame: [seqHi][seqLo][0x24][payloadLen:2][UTC:4][Local:4]
          // Z2M format: UTC FIRST, Local SECOND (see zigbee-herdsman-converters/src/lib/tuya.ts)
          const rawFrame = Buffer.alloc(13);
          rawFrame.writeUInt16BE(Date.now() % 65535, 0); // Sequence number
          rawFrame.writeUInt8(0x24, 2);                   // Command: mcuSyncTime
          rawFrame.writeUInt16BE(8, 3);                   // Payload length: 8 bytes
          rawFrame.writeUInt32BE(utcSecondsFix, 5);          // UTC time FIRST (Z2M format)
          rawFrame.writeUInt32BE(localSeconds, 9);        // Local time SECOND

          this.log(`[CLIMATE] 🔧 Raw frame attempt: UTC=${utcSecondsFix}, Local=${localSeconds}`);
          this.log(`[CLIMATE] 🔧 Frame hex: ${rawFrame.toString('hex')}`);

          // Try to send via endpoint
          const ep = this.zclNode?.endpoints?.[1];
          if (ep && typeof ep.sendFrame === 'function') {
            await ep.sendFrame(0xEF00, rawFrame);
            this.log('[CLIMATE] ✅ Sent via endpoint.sendFrame(0xEF00)');
            success = true;
          } else if (this.node && typeof this.node.sendFrame === 'function') {
            await this.node.sendFrame(0xEF00, rawFrame, 1);
            this.log('[CLIMATE] ✅ Sent via node.sendFrame(0xEF00)');
            success = true;
          }
        } catch (e) {
          this.log('[CLIMATE] Raw frame failed:', e.message);
        }
      }

      if (success) {
        this.log('[CLIMATE] 🔥 ✅ FORCED time sync delivered!');
        this.log('[CLIMATE] 🔥 ⏰ LCD display should now show correct time');
        return true;
      } else {
        this.log('[CLIMATE] 🔥 ⚠️ All sync methods failed - RE-PAIR device may be needed');
        return false;
      }
    } catch (err) {
      this.log('[CLIMATE] 🔥 ❌ FORCED time sync failed:', err.message);
      return false;
    }
  }

  /**
   * v5.5.192: INTELLIGENT time sync based on manufacturer detection
   * - _TZE284_* LCD devices: Use Tuya epoch (2000) for correct LCD display
   * - _TZE200_* devices: Use Tuya epoch (most have LCD)
   * - _TZ3000_* ZCL devices: No time sync needed (ZCL standard)
   * Reference: https://github.com/Koenkk/zigbee2mqtt/issues/30054
   */
  async _sendTimeSync() {
    try {
      const protocol = this.deviceProtocol;
      const mfr = this._manufacturerName || '';

      // ZCL standard devices don't need Tuya time sync
      if (protocol === 'ZCL_STANDARD') {
        this.log('[CLIMATE] 🕐 ZCL device - no Tuya time sync needed');
        return;
      }

      const now = new Date();
      const settings = this.getSettings() || {};

      // v5.5.384: Read user settings for time format and timezone
      const userTimeFormat = settings.time_sync_format || 'auto';
      const userTimezone = settings.time_sync_timezone || 'auto';

      // Calculate timezone from settings or auto-detect
      let timezoneMinutes;
      if (userTimezone === 'auto') {
        timezoneMinutes = -now.getTimezoneOffset(); // JS inverted
      } else {
        const tzMap = { 'utc': 0, 'gmt+1': 60, 'gmt+2': 120, 'gmt+3': 180, 'gmt-5': -300, 'gmt-8': -480, 'gmt+8': 480 };
        timezoneMinutes = tzMap[userTimezone] ?? -now.getTimezoneOffset();
      }

      const useTuyaEpoch = this.needsTuyaEpoch;
      this.log(`[CLIMATE] 🕐 Sending time sync (format: ${userTimeFormat}, TZ: ${userTimezone})...`);
      this.log(`[CLIMATE] 🕐 Manufacturer: ${mfr || 'unknown'}`);
      this.log(`[CLIMATE] 🕐 Local: ${now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      this.log(`[CLIMATE] 🕐 TZ offset: GMT${timezoneMinutes >= 0 ? '+' : ''}${timezoneMinutes / 60}`);

      // v5.5.437: Use syncDeviceTimeTuya directly (fix _getTuyaManager not a function)
      const result = await syncDeviceTimeTuya(this, {
        logPrefix: '[CLIMATE]',
        useTuyaEpoch: useTuyaEpoch,
        timezoneMinutes: timezoneMinutes
      });

      if (result) {
        this.log('[CLIMATE] ✅ Time sync sent successfully!');
      } else {
        this.log('[CLIMATE] ⚠️ Time sync could not be delivered (device may be sleeping)');
      }
    } catch (err) {
      this.log('[CLIMATE] ❌ Time sync failed:', err.message);
    }
  }

  /**
   * v5.5.440: Send Tuya DP command for LCD time sync
   * Based on HybridCoverBase implementation
   */
  async _sendTuyaDP(dpId, value, dataType = 'value') {
    try {
      this.log(`[CLIMATE] Sending DP${dpId}=${value} (${dataType})`);

      const ep = this.zclNode?.endpoints?.[1];
      const tuyaCluster = ep?.clusters?.tuya ||
        ep?.clusters?.manuSpecificTuya ||
        ep?.clusters?.[61184] ||
        ep?.clusters?.[0xEF00];

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available - device needs RE-PAIRING');
      }

      // Build DP payload
      const dpData = this._buildTuyaDPPayload(dpId, value, dataType);

      // Try multiple methods
      if (typeof tuyaCluster.dataRequest === 'function') {
        await tuyaCluster.dataRequest({ data: dpData });
        return;
      }
      if (typeof tuyaCluster.setData === 'function') {
        await tuyaCluster.setData({ data: dpData });
        return;
      }
      if (typeof tuyaCluster.command === 'function') {
        await tuyaCluster.command('dataRequest', { data: dpData });
        return;
      }

      throw new Error('No available DP send method');
    } catch (err) {
      this.log(`[CLIMATE] DP${dpId} send failed:`, err.message);
      throw err;
    }
  }

  /**
   * v5.5.440: Build Tuya DP payload buffer
   */
  _buildTuyaDPPayload(dpId, value, dataType) {
    if (dataType === 'value') {
      // 4-byte integer value
      const buf = Buffer.alloc(8);
      buf.writeUInt8(dpId, 0);
      buf.writeUInt8(2, 1); // type: 2=value
      buf.writeUInt16BE(4, 2); // length: 4 bytes
      buf.writeInt32BE(value, 4);
      return buf;
    } else {
      // 1-byte enum/bool
      const buf = Buffer.alloc(5);
      buf.writeUInt8(dpId, 0);
      buf.writeUInt8(dataType === 'bool' ? 1 : 4, 1);
      buf.writeUInt16BE(1, 2);
      buf.writeUInt8(value, 4);
      return buf;
    }
  }

  /**
   * v5.5.227: Clean up intervals on destroy - including new ZCL Time + LCD intervals
   */
  async onDestroy() {
    if (this._dailySyncInterval) {
      this.homey.clearInterval(this._dailySyncInterval);
      this._dailySyncInterval = null;
    }
    if (this._hourlySyncInterval) {
      this.homey.clearInterval(this._hourlySyncInterval);
      this._hourlySyncInterval = null;
    }
    if (this._dailyZclSyncInterval) {
      this.homey.clearInterval(this._dailyZclSyncInterval);
      this._dailyZclSyncInterval = null;
    }
    // v5.5.227: Clean up LCD-specific sync interval
    if (this._hourlyLcdSyncInterval) {
      this.homey.clearInterval(this._hourlyLcdSyncInterval);
      this._hourlyLcdSyncInterval = null;
    }
    return super.onDestroy();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.188: EXPLICIT ZCL CLUSTER SETUP (like v5.5.165)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.188: Setup explicit ZCL clusters with bind + configure reporting
   * This is CRITICAL for battery, temperature, and humidity on ZCL devices
   */
  async _setupExplicitZCLClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) {
      this.log('[ZCL-SETUP] ⚠️ No endpoint 1');
      return;
    }

    this.log('[ZCL-SETUP] 🔧 Setting up explicit ZCL clusters...');

    // ─────────────────────────────────────────────────────────────────────
    // POWER CONFIGURATION (Battery) - Cluster 0x0001
    // ─────────────────────────────────────────────────────────────────────
    const powerCfg = ep1.clusters?.powerConfiguration;
    if (powerCfg) {
      this.log('[ZCL-SETUP] 🔋 PowerConfiguration cluster found');
      try {
        // Step 1: Bind cluster to coordinator
        if (typeof powerCfg.bind === 'function') {
          await powerCfg.bind().catch(() => { });
          this.log('[ZCL-SETUP] ✅ PowerConfiguration bound');
        }

        // Step 2: Configure reporting for battery
        if (typeof powerCfg.configureReporting === 'function') {
          await powerCfg.configureReporting({
            batteryPercentageRemaining: {
              minInterval: 3600,    // 1 hour min
              maxInterval: 21600,   // 6 hours max
              minChange: 2          // Report on 1% change
            }
          }).catch(() => { });
          this.log('[ZCL-SETUP] ✅ Battery reporting configured');
        }

        // Step 3: Setup attribute listener
        if (typeof powerCfg.on === 'function') {
          powerCfg.on('attr.batteryPercentageRemaining', (value) => {
            const battery = Math.round(value / 2);
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this.setCapabilityValue('measure_battery', parseFloat(Math.max(0, Math.min(100, battery)))).catch(() => { });
          });
          this.log('[ZCL-SETUP] ✅ Battery listener active');
        }
      } catch (e) {
        this.log('[ZCL-SETUP] PowerConfiguration setup error:', e.message);
      }
    } else {
      this.log('[ZCL-SETUP] ⚠️ No PowerConfiguration cluster');
    }

    // ─────────────────────────────────────────────────────────────────────
    // TEMPERATURE MEASUREMENT - Cluster 0x0402
    // ─────────────────────────────────────────────────────────────────────
    const tempCluster = ep1.clusters?.temperatureMeasurement || ep1.clusters?.msTemperatureMeasurement;
    if (tempCluster) {
      this.log('[ZCL-SETUP] 🌡️ TemperatureMeasurement cluster found');
      try {
        if (typeof tempCluster.bind === 'function') {
          await tempCluster.bind().catch(() => { });
          this.log('[ZCL-SETUP] ✅ Temperature bound');
        }

        if (typeof tempCluster.configureReporting === 'function') {
          await tempCluster.configureReporting({
            measuredValue: {
              minInterval: 60,      // 1 min
              maxInterval: 3600,    // 1 hour
              minChange: 10         // 0.1°C
            }
          }).catch(() => { });
          this.log('[ZCL-SETUP] ✅ Temperature reporting configured');
        }

        if (typeof tempCluster.on === 'function') {
          tempCluster.on('attr.measuredValue', (value) => {
            const temp = value / 100;
            if (temp >= VALIDATION.TEMP_MIN && temp <= VALIDATION.TEMP_MAX) {
              // v5.5.793: Apply calibration offset
              const calibratedTemp = this._applyTempOffset(temp);
              this.log(`[ZCL] 🌡️ Temperature: ${calibratedTemp}°C`);
              this.setCapabilityValue('measure_temperature', parseFloat(calibratedTemp)).catch(() => { });
            }
          });
          this.log('[ZCL-SETUP] ✅ Temperature listener active');
        }
      } catch (e) {
        this.log('[ZCL-SETUP] Temperature setup error:', e.message);
      }
    } else {
      this.log('[ZCL-SETUP] ⚠️ No TemperatureMeasurement cluster');
    }

    // ─────────────────────────────────────────────────────────────────────
    // RELATIVE HUMIDITY - Cluster 0x0405
    // ─────────────────────────────────────────────────────────────────────
    const humCluster = ep1.clusters?.relativeHumidity || ep1.clusters?.msRelativeHumidity;
    if (humCluster) {
      this.log('[ZCL-SETUP] 💧 RelativeHumidity cluster found');
      try {
        if (typeof humCluster.bind === 'function') {
          await humCluster.bind().catch(() => { });
          this.log('[ZCL-SETUP] ✅ Humidity bound');
        }

        if (typeof humCluster.configureReporting === 'function') {
          await humCluster.configureReporting({
            measuredValue: {
              minInterval: 60,
              maxInterval: 3600,
              minChange: 100        // 1%
            }
          }).catch(() => { });
          this.log('[ZCL-SETUP] ✅ Humidity reporting configured');
        }

        if (typeof humCluster.on === 'function') {
          humCluster.on('attr.measuredValue', (value) => {
            let hum = value / 100;
            // v5.5.793: Auto-detect divisor for devices reporting 0-1000 scale
            if (hum > VALIDATION.HUMIDITY_AUTO_DIVISOR_THRESHOLD) {
              hum = Math.round(hum / 10);
            }
            if (hum >= VALIDATION.HUMIDITY_MIN && hum <= VALIDATION.HUMIDITY_MAX) {
              // v5.5.793: Apply calibration offset
              const calibratedHum = this._applyHumOffset(hum);
              this.log(`[ZCL] 💧 Humidity: ${calibratedHum}%`);
              this.setCapabilityValue('measure_humidity', parseFloat(calibratedHum)).catch(() => { });
            }
          });
          this.log('[ZCL-SETUP] ✅ Humidity listener active');
        }
      } catch (e) {
        this.log('[ZCL-SETUP] Humidity setup error:', e.message);
      }
    } else {
      this.log('[ZCL-SETUP] ⚠️ No RelativeHumidity cluster');
    }

    this.log('[ZCL-SETUP] ✅ Explicit ZCL setup complete');
  }

  /**
   * v5.5.188: Read ZCL attributes immediately after init
   * Try to get initial values for temp, humidity, battery
   */
  async _readZCLAttributesNow(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    this.log('[ZCL-READ] 📖 Reading ZCL attributes...');

    // Read battery
    const powerCfg = ep1.clusters?.powerConfiguration;
    if (powerCfg && typeof powerCfg.readAttributes === 'function') {
      try {
        const attrs = await powerCfg.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(() => ({}));
        if (attrs.batteryPercentageRemaining !== undefined) {
          const battery = Math.round(attrs.batteryPercentageRemaining / 2);
          this.log(`[ZCL-READ] 🔋 Battery: ${battery}%`);
          await this.setCapabilityValue('measure_battery', parseFloat(Math.max(0, Math.min(100, battery)))).catch(() => { });
        }
      } catch (e) {
        this.log('[ZCL-READ] Battery read failed:', e.message);
      }
    }

    // Read temperature
    const tempCluster = ep1.clusters?.temperatureMeasurement || ep1.clusters?.msTemperatureMeasurement;
    if (tempCluster && typeof tempCluster.readAttributes === 'function') {
      try {
        const attrs = await tempCluster.readAttributes(['measuredValue']).catch(() => ({}));
        if (attrs.measuredValue !== undefined) {
          const temp = attrs.measuredValue / 100;
          if (temp >= -40 && temp <= 80) {
            this.log(`[ZCL-READ] 🌡️ Temperature: ${temp}°C`);
            await this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
          }
        }
      } catch (e) {
        this.log('[ZCL-READ] Temperature read failed:', e.message);
      }
    }

    // Read humidity
    const humCluster = ep1.clusters?.relativeHumidity || ep1.clusters?.msRelativeHumidity;
    if (humCluster && typeof humCluster.readAttributes === 'function') {
      try {
        const attrs = await humCluster.readAttributes(['measuredValue']).catch(() => ({}));
        if (attrs.measuredValue !== undefined) {
          const hum = attrs.measuredValue / 100;
          if (hum >= 0 && hum <= 100) {
            this.log(`[ZCL-READ] 💧 Humidity: ${hum}%`);
            await this.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(() => { });
          }
        }
      } catch (e) {
        this.log('[ZCL-READ] Humidity read failed:', e.message);
      }
    }

    this.log('[ZCL-READ] ✅ ZCL attribute read complete');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DP REQUEST SCHEDULING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.180: Schedule initial DP requests for sleepy devices
   */
  _scheduleInitialDPRequests() {
    const intervals = [10000, 30000, 120000, 300000, 600000]; // 10s, 30s, 2m, 5m, 10m
    const dpIds = [1, 2, 4, 18]; // temp, humidity, battery, alt temp

    this._aggressiveTimers = [];

    intervals.forEach((delay, index) => {
      const timer = this.homey.setTimeout(async () => {
        this.log(`[CLIMATE] ⏰ DP request attempt ${index + 1}/${intervals.length}`);

        const zclNode = this._zclNode;
        if (!zclNode) return;

        if (this._hasTuyaCluster) {
          await this._sendTuyaMagicPacket(zclNode).catch(() => { });

          if (this.safeTuyaDataQuery) {
            await this.safeTuyaDataQuery(dpIds, {
              logPrefix: '[CLIMATE-WAKE]',
              delayBetweenQueries: 100
            }).catch(() => { });
          }
        }

        // Trigger time sync on wake
        await this._sendTimeSync().catch(() => { });
      }, delay);

      this._aggressiveTimers.push(timer);
    });

    this.log('[CLIMATE] 📅 Scheduled DP requests at: 10s, 30s, 2m, 5m, 10m');
  }

  /**
   * v5.5.89: Send Tuya Magic Packet to configure TZE284 devices
   * Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
   *
   * Z2M does: tuya.configureMagicPacket + dataQuery
   * This tells the device to start reporting data!
   */
  async _sendTuyaMagicPacket(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[MAGIC-PACKET] ⚠️ No endpoint 1');
      return;
    }

    // v5.5.89: Try multiple cluster name variations
    const tuyaCluster = endpoint.clusters?.['tuya'] ||
      endpoint.clusters?.[61184] ||
      endpoint.clusters?.['manuSpecificTuya'] ||
      endpoint.clusters?.[0xEF00];

    this.log('[MAGIC-PACKET] 🔍 Available clusters:', Object.keys(endpoint.clusters || {}));

    if (!tuyaCluster) {
      this.log('[MAGIC-PACKET] ⚠️ No Tuya cluster (0xEF00) found - trying raw');
      await this._sendMagicPacketRaw(zclNode);
      return;
    }

    try {
      // v5.5.89: Use the new sendMagicPacket method if available
      if (typeof tuyaCluster.sendMagicPacket === 'function') {
        this.log('[MAGIC-PACKET] 📤 Using cluster sendMagicPacket()...');
        await tuyaCluster.sendMagicPacket();
        this.log('[MAGIC-PACKET] ✅ Magic packet sent via cluster method');
      } else {
        // Fallback: Send commands individually
        this.log('[MAGIC-PACKET] 📤 Sending MCU Version Request (0x10)...');
        if (typeof tuyaCluster.mcuVersionRequest === 'function') {
          await tuyaCluster.mcuVersionRequest({});
          this.log('[MAGIC-PACKET] ✅ MCU Version Request sent');
        } else {
          this.log('[MAGIC-PACKET] ⚠️ mcuVersionRequest not available');
        }

        await new Promise(r => setTimeout(r, 200));

        this.log('[MAGIC-PACKET] 📤 Sending Data Query (0x03)...');
        if (typeof tuyaCluster.dataQuery === 'function') {
          await tuyaCluster.dataQuery({});
          this.log('[MAGIC-PACKET] ✅ Data Query sent');
        } else {
          this.log('[MAGIC-PACKET] ⚠️ dataQuery not available');
        }
      }

      // Step 3: Also send time sync immediately
      this.log('[MAGIC-PACKET] 🕐 Sending time sync...');
      await syncDeviceTimeTuya(this, { logPrefix: '[MAGIC-PACKET]' }).catch(() => { });

      this.log('[MAGIC-PACKET] ✅ Magic packet sequence complete!');
    } catch (err) {
      this.log('[MAGIC-PACKET] ⚠️ Error:', err.message);
      // Try raw fallback
      await this._sendMagicPacketRaw(zclNode).catch(() => { });
    }
  }

  /**
   * v5.5.89: Send magic packet via raw ZCL frame
   * This is a fallback when cluster methods aren't available
   */
  async _sendMagicPacketRaw(zclNode) {
    try {
      this.log('[MAGIC-PACKET-RAW] 📤 Sending via raw ZCL command...');

      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[MAGIC-PACKET-RAW] ⚠️ No endpoint 1');
        return;
      }

      // Try to get the raw cluster and send commands
      const cluster = endpoint.clusters?.tuya || endpoint.clusters?.[61184];

      if (cluster) {
        // Send MCU Version Request (Command 0x10)
        try {
          await cluster.command('mcuVersionRequest', {});
          this.log('[MAGIC-PACKET-RAW] ✅ MCU Version Request sent');
        } catch (e) {
          this.log('[MAGIC-PACKET-RAW] MCU Version via command failed:', e.message);
        }

        await new Promise(r => setTimeout(r, 200));

        // Send Data Query (Command 0x03)
        try {
          await cluster.command('dataQuery', {});
          this.log('[MAGIC-PACKET-RAW] ✅ Data Query sent');
        } catch (e) {
          this.log('[MAGIC-PACKET-RAW] Data Query via command failed:', e.message);
        }
      } else {
        this.log('[MAGIC-PACKET-RAW] ⚠️ No Tuya cluster available');
      }
    } catch (err) {
      this.log('[MAGIC-PACKET-RAW] ⚠️ Error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFRESH AND CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.180: Refresh all DPs + time sync
   */
  async refreshAll() {
    this.log('[CLIMATE-REFRESH] Refreshing all DPs + time sync...');

    const allDPs = [1, 2, 4, 18]; // temp, humidity, battery, alt temp

    if (this.safeTuyaDataQuery) {
      await this.safeTuyaDataQuery(allDPs, {
        logPrefix: '[CLIMATE-REFRESH]',
        delayBetweenQueries: 150,
      });
    }

    // Trigger time sync
    await this._sendTimeSync().catch(() => { });

    return true;
  }

  /**
   * v5.5.208: onEndDeviceAnnounce - ZCL Time Cluster wake-up sync
   * Uses ZigbeeTimeSync with throttle protection (ultra battery-safe)
   */
  async onEndDeviceAnnounce() {
    this.log('[CLIMATE] 🔔 Device announced (wake from sleep)');

    // RTC devices: use ZCL Time Cluster sync on wake-up
    const rtcDetection = TuyaRtcDetector.hasRtc(this);
    if (rtcDetection.hasRtc && this.zigbeeTimeSync) {
      this.log('[CLIMATE] 🕐 RTC device wake - triggering ZCL Time sync...');

      // ZigbeeTimeSync has built-in 24h throttle - won't spam battery
      const result = await this.zigbeeTimeSync.sync();
      if (result.success) {
        this.log('[CLIMATE] ✅ Wake-up ZCL Time sync successful');
      } else if (result.reason !== 'throttled') {
        this.log(`[CLIMATE] ⚠️ Wake-up sync failed: ${result.reason}`);
      }
    }

    // Legacy time sync for non-RTC devices
    else if (this.timeManager && TuyaDeviceClassifier.hasRtcScreen(this)) {
      await this.timeManager.sync({
        useEpoch2000: this.needsTuyaEpoch,
        retries: 1
      });
    }

    // Call parent handler if it exists
    if (super.onEndDeviceAnnounce) {
      await super.onEndDeviceAnnounce();
    }
  }

  /**
   * v5.5.189: Override _handleDP to trigger time sync on data reception
   * Merged from climate_box_vvmbj46n - LCD devices need time sync when they wake
   */
  async _handleDP(dp, value, dataType) {
    // Device is awake! Trigger time sync for LCD displays
    if ((this._manufacturerName || '').toLowerCase().includes('_tze284')) {
      this._sendTimeSync().catch(() => { });
    }

    // v5.8.98: Soil sensor profile override (ZHA #4282, Z2M #27501)
    // DP5=temperature(÷10), DP3=soil_moisture(%), DP15=battery(%)
    if (this._isSoilSensor()) {
      if (dp === 5) {
        const temp = this._applyTempOffset(value / 10);
        this.log(`[SOIL] DP5 temperature raw=${value} → ${temp}°C`);
        await this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => {});
        return;
      }
      if (dp === 3) {
        const moisture = value > 100 ? Math.round(value / 10) : value;
        this.log(`[SOIL] DP3 soil_moisture raw=${value} → ${moisture}%`);
        await this.setCapabilityValue('measure_humidity', moisture).catch(() => {});
        return;
      }
      if (dp === 15) {
        const bat = Math.min(value, 100);
        this.log(`[SOIL] DP15 battery raw=${value} → ${bat}%`);
        await this.setCapabilityValue('measure_battery', bat).catch(() => {});
        return;
      }
    }

    // Apply calibration offsets before passing to parent
    let processedValue = value;

    if (dp === 1 || dp === 6 || dp === 18) {
      // Temperature DPs - apply offset after division
      const rawTemp = value / 10;
      processedValue = this._applyTempOffset(rawTemp) * 10; // Scale back for parent processing
    } else if (dp === 2 || dp === 7 || dp === 103) {
      // Humidity DPs - apply offset
      processedValue = this._applyHumOffset(value);
    }

    // Call parent handler
    if (super._handleDP) {
      return super._handleDP(dp, processedValue, dataType);
    }
  }

  // v5.8.98: Soil sensor profile (ZHA #4282, Z2M #27501)
  _isSoilSensor() {
    const mfr = (this._manufacturerName || '').toLowerCase();
    return ['_tze284_oitavov2', '_tze200_myd45weu', '_tze200_ga1maeof',
      '_tze200_9cqcpkgb', '_tze204_myd45weu', '_tze284_myd45weu',
      '_tze200_2se8efxh'].some(s => mfr.includes(s));
  }

  /**
   * v5.5.189: Enhanced logging for DP data with calibration support
   * Shows raw + converted values for each DP
   *
   * CRITICAL DP MAPPING for _TZE284_vvmbj46n (TH05Z):
   * - DP1: temperature ÷10
   * - DP2: humidity %
   * - DP4: battery × 2 (device reports half)
   */
  onTuyaStatus(status) {
    if (!status) {
      super.onTuyaStatus(status);
      return;
    }

    const dp = status.dp;
    const rawValue = status.data || status.value;

    // v5.5.191: Very visible log when device sends data - helps diagnose sleepy device issues
    this.log('');
    this.log('[CLIMATE] ════════════════════════════════════════════════════════════');
    this.log(`[CLIMATE] 🎉 DATA RECEIVED! Device is AWAKE! DP${dp}=${rawValue}`);
    this.log('[CLIMATE] ════════════════════════════════════════════════════════════');

    // v5.5.190: Log with calibration info
    switch (dp) {
      case 1: // Temperature (standard) ÷10
        const temp1 = this._applyTempOffset(rawValue / 10);
        this.log(`[CLIMATE-DP] DP1 temperature raw=${rawValue} → ${temp1}°C`);
        break;
      case 18: // Temperature (alt) ÷10
      case 6: // Temperature (some _TZE204 models)
        const tempAlt = this._applyTempOffset(rawValue / 10);
        this.log(`[CLIMATE-DP] DP${dp} temperature_alt raw=${rawValue} → ${tempAlt}°C`);
        break;
      case 2: // Humidity (standard)
        const hum2 = this._applyHumOffset(rawValue);
        this.log(`[CLIMATE-DP] DP2 humidity raw=${rawValue} → ${hum2}%`);
        break;
      case 7: // Humidity (some _TZE204 models)
      case 103: // Humidity (alt)
        const humAlt = this._applyHumOffset(rawValue);
        this.log(`[CLIMATE-DP] DP${dp} humidity_alt raw=${rawValue} → ${humAlt}%`);
        break;
      case 3: // Battery state enum (some _TZE200 devices)
        let bat3 = rawValue;
        if (rawValue === 0) bat3 = 10;      // low
        else if (rawValue === 1) bat3 = 50; // medium
        else if (rawValue === 2) bat3 = 100; // high
        else bat3 = Math.min(rawValue * 2, 100);
        this.log(`[CLIMATE-DP] DP3 battery_state raw=${rawValue} → ${bat3}% (enum: 0=low, 1=med, 2=high)`);
        break;
      case 4: // Battery (standard with ×2 multiplier)
        const batConverted = Math.min(rawValue * 2, 100);
        this.log(`[CLIMATE-DP] DP4 battery raw=${rawValue} → ${batConverted}% (×2 multiplier)`);
        break;
      case 5: // Illuminance (some models)
        this.log(`[CLIMATE-DP] DP5 illuminance raw=${rawValue} lux`);
        break;
      case 9: // Temperature unit setting
        this.log(`[CLIMATE-DP] DP9 temp_unit raw=${rawValue} (0=C, 1=F)`);
        break;
      case 101:
      case 102: // Button press
        this.log(`[CLIMATE-DP] DP${dp} button_press raw=${rawValue}`);
        break;
      default:
        if (dp !== undefined) {
          this.log(`[CLIMATE-DP] DP${dp} OTHER raw=${rawValue}`);
        }
    }

    // Call parent handler to set capabilities
    super.onTuyaStatus(status);

    // Log final capability values after processing
    this.homey.setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      if (temp !== null || hum !== null || bat !== null) {
        this.log(`[CLIMATE] ✅ CAPABILITIES: temp=${temp}°C humidity=${hum}% battery=${bat}%`);
      }
    }, 100);
  }

  /**
   * v5.5.183: Cleanup on uninit
   */
  async onUninit() {
    this.log('[CLIMATE] onUninit - cleaning up...');

    // Clear hourly time sync interval
    if (this._hourlySyncInterval) {
      this.homey.clearInterval(this._hourlySyncInterval);
      this._hourlySyncInterval = null;
    }

    // Clear DP request timers
    if (this._aggressiveTimers) {
      this._aggressiveTimers.forEach(t => this.homey.clearTimeout(t));
      this._aggressiveTimers = null;
    }

    if (super.onUninit) {
      await super.onUninit();
    }

    this.log('[CLIMATE] ✅ Cleanup complete');
  }

  async onDeleted() {
    this.log('[CLIMATE] Device deleted');
    await this.onUninit();
    if (super.onDeleted) {
      await super.onDeleted().catch(() => { });
    }
  }
}

module.exports = ClimateSensorDevice;
