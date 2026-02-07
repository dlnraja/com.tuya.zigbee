'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');
const IASZoneManager = require('../../lib/managers/IASZoneManager');
const { MotionLuxInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

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
  HUMIDITY_AUTO_DIVISOR_THRESHOLD: 100,
};

/**
 * Motion Sensor Device - HybridSensorBase implementation
 *
 * v5.5.806: FORUM FIX - Continuous illuminance reporting (independent of motion)
 * v5.5.317: INTELLIGENT INFERENCE - Infer motion from lux changes when PIR fails
 * v5.5.299: SLEEPY DEVICE COMMUNICATION FIX (@fiek diagnostic d8b86ec9)
 * - Smart ZCL timeout reduction for sleepy devices (5s → 2s)
 * - Prioritize Tuya DP communication over ZCL for battery devices
 * - Skip ZCL queries when device detected as sleeping
 * - Enhanced wake strategy for critical attribute reads
 * - Improved error handling and timeout management
 *
 * v5.5.107: TEMPERATURE FIX (Peter's diagnostic report)
 * - Force add temp/humidity capabilities if clusters detected
 * - Improved cluster detection with multiple name variants
 * - Read temp/humidity on EVERY wake event, not just motion
 *
 * v5.5.104: CRITICAL FIX for 4-in-1 Multisensors (Peter's bug)
 * - Read temp/humidity WHEN device is awake (after motion detection)
 * - Configure reporting for passive updates
 * - These sleepy devices don't respond to queries when sleeping!
 *
 * v5.5.86: Added temperature + humidity for 4-in-1 multisensors
 * Supports: Fantem ZB003-x, Immax 07502L, Generic Tuya Multisensor
 * Source: https://community.home-assistant.io/t/tuya-zigbee-multi-sensor-4-in-1/409780
 */
class MotionSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  /**
   * v5.5.299: Sleepy device detection for smart communication
   * Helps prioritize Tuya DP over ZCL for battery devices
   */
  get isSleepyDevice() { return true; }

  /**
   * v5.5.299: Smart ZCL timeout for sleepy devices
   * Reduces timeout from 5s to 2s to prevent excessive waiting
   */
  get zclTimeout() { return 2000; }

  /**
   * v5.5.113: Only include CORE capabilities by default
   * Temperature and humidity are added dynamically if clusters are detected
   * This fixes the "incorrect labels" issue (Cam's report #604)
   */
  get sensorCapabilities() {
    // Core capabilities only - temp/humidity added dynamically if detected
    return [
      'alarm_motion',
      'measure_battery',
      'measure_luminance',
    ];
  }

  /**
   * v5.5.753: MANUFACTURER-AWARE DP MAPPINGS
   * Different manufacturers use same DPs for different purposes!
   * 
   * MANUFACTURER PROFILES:
   * ┌────────────────────────┬────────┬────────┬────────┬────────┬────────┐
   * │ Manufacturer           │ DP4    │ DP5    │ DP6    │ DP9    │ DP102  │
   * ├────────────────────────┼────────┼────────┼────────┼────────┼────────┤
   * │ ZG-204ZL (_TZE200_3to) │ BATT   │ -      │ -      │ LUX    │ -      │
   * │ Fantem ZB003-x         │ BATT   │ TEMP   │ HUMID  │ LUX    │ LUX    │
   * │ Simple PIR (_TZ3000_*) │ BATT   │ -      │ -      │ LUX    │ -      │
   * │ ZG-204ZM Radar         │ DIST   │ -      │ -      │ -      │ TIME   │
   * │ Default TS0601         │ BATT   │ TEMP   │ HUMID  │ LUX    │ LUX    │
   * └────────────────────────┴────────┴────────┴────────┴────────┴────────┘
   */
  
  // v5.5.753: Manufacturer profiles for DP mapping
  static get MANUFACTURER_DP_PROFILES() {
    return {
      // v5.5.920: FORUM FIX (Peter_van_Werkhoven #1225)
      // _TZE200_3towulqd is ZG-204ZL (PIR ONLY - NO temp/humidity!)
      // ZG-204ZV with temp/humidity uses DIFFERENT manufacturer IDs
      // Source: Z2M GitHub #12364, Blakadder database
      'ZG204ZL_PIR_ONLY': {
        patterns: ['_TZE200_3towulqd', '_tze200_3towulqd', '_TZE204_3towulqd',
                   '_TZE200_1ibpyhdc', '_tze200_1ibpyhdc', '_TZE200_bh3n6gk8'],
        dp4: 'measure_battery',  // DP4 = battery, NOT temperature
        dp12: 'measure_luminance',
        isPirOnly: true,  // NO temp/humidity sensors
      },
      // Fantem ZB003-x 4-in-1 multisensor
      // DP5=temp(÷10), DP6=humidity
      'FANTEM': {
        patterns: ['_TZE200_7hfcudw5', '_TZE200_myd45weu', '_TZE200_pay2byax', 
                   '_TZE200_nlrfgpny', 'ZB003-X'],
        dp4: 'measure_battery',
        dp5: 'measure_temperature',
        dp6: 'measure_humidity',
        dp5_divisor: 10,
        dp6_divisor: 1,
        dp102: 'measure_luminance',
      },
      // v5.5.991: HOBEIAN ZG-204ZV Multisensor (Peter_van_Werkhoven forum)
      // DP1=motion, DP3=temp(/10), DP4=humidity(*10!), DP9=lux, DP12=battery
      // CRITICAL: Humidity needs *10 multiplier (shows 9% instead of 90%)
      'ZG204ZV_MULTISENSOR': {
        patterns: ['_TZE200_rxqls8v0', '_tze200_rxqls8v0', '_TZE204_rxqls8v0'],
        dp3: 'measure_temperature',
        dp3_divisor: 10,
        dp4: 'measure_humidity',
        dp4_multiplier: 10,  // Humidity needs *10 (raw 9 = 90%)
        dp9: 'measure_luminance',
        dp12: 'measure_battery',
        hasTemp: true,
        hasHumidity: true,
      },
      // HOBEIAN ZG-204ZM Radar (mmWave presence)
      // DP4=distance, NOT battery or temp
      'ZG204ZM_RADAR': {
        patterns: ['_TZE200_2aaelwxk', '_tze200_2aaelwxk', '_TZE204_2aaelwxk',
                   '_TZE200_kb5noeto', '_tze200_kb5noeto'],
        dp4: 'internal_distance', // Not a standard capability
        dp102: 'internal_fading_time',
        isRadar: true,
      },
      // Simple PIR sensors (no temp/humidity)
      'SIMPLE_PIR': {
        patterns: ['_TZ3000_', '_TZ3210_', '_TYZB01_'],
        dp4: 'measure_battery',
        dp5: null,
        dp6: null,
        isPirOnly: true,
      },
      // Immax 07502L and similar
      'IMMAX': {
        patterns: ['_TZE200_ppuj1vem', 'Immax'],
        dp4: 'measure_battery',
        dp5: 'measure_temperature',
        dp6: 'measure_humidity',
        dp5_divisor: 10,
        dp6_divisor: 1,
      },
    };
  }

  /**
   * v5.5.753: Detect manufacturer profile from device data
   * v5.5.992: PERMISSIVE MODE for variant manufacturers (Peter_van_Werkhoven ZG-204ZV fix)
   * Problem: _TZE200_3towulqd can be ZG-204ZL (PIR) OR ZG-204ZV (multisensor)
   * Solution: Return PERMISSIVE profile for variants - let DPs determine capabilities
   */
  _getManufacturerProfile() {
    // v5.8.53: Use comprehensive fallback chain (matching BaseHybridDevice._detectProtocol)
    // Root cause (diag e2148e06): getData()?.manufacturerName was undefined for _TZE200_3towulqd
    const mfr = this.getSetting?.('zb_manufacturer_name')
      || this.getSetting?.('zb_manufacturerName')
      || this.getStoreValue?.('manufacturerName')
      || this.getData()?.manufacturerName
      || '';
    const mfrLower = mfr.toLowerCase();
    
    // v5.5.992: CRITICAL FIX - Check for VARIANT manufacturers FIRST
    // These have multiple hardware variants with same manufacturerName
    // Return PERMISSIVE profile that accepts all DP types
    const isVariant = MotionSensorDevice.VARIANT_MANUFACTURERS.some(v => 
      mfrLower.includes(v.toLowerCase())
    );
    
    if (isVariant) {
      this.log(`[MOTION-DP] 🔀 VARIANT manufacturer detected: ${mfr}`);
      this.log('[MOTION-DP] Using PERMISSIVE profile - capabilities added from received DPs');
      // Permissive profile: Accept temp/humidity on DPs 3,4,5,6 and battery on DP12
      // This handles both ZG-204ZL (PIR) and ZG-204ZV (multisensor) with same mfr
      return { 
        name: 'PERMISSIVE_VARIANT',
        dp3: 'measure_temperature',  // ZG-204ZV: temp on DP3
        dp3_divisor: 10,
        dp4: 'measure_humidity',     // ZG-204ZV: humidity on DP4 (*10 multiplier)
        dp4_multiplier: 10,
        dp5: 'measure_temperature',  // Fantem: temp on DP5
        dp5_divisor: 10,
        dp6: 'measure_humidity',     // Fantem: humidity on DP6
        dp6_divisor: 1,
        dp9: 'measure_luminance',    // ZG-204ZV: lux on DP9
        // v5.8.53: DP12 NOT mapped here - ambiguous between variants:
        //   ZG-204ZL: DP12 = illuminance (e.g. 1999 lux)
        //   ZG-204ZV: DP12 = battery (0-100%)
        // Let base class smart detection handle it (diag e2148e06: DP12=1999 was wrongly mapped to battery)
        isPermissive: true,
        hasTemp: true,
        hasHumidity: true,
      };
    }
    
    for (const [profileName, profile] of Object.entries(MotionSensorDevice.MANUFACTURER_DP_PROFILES)) {
      for (const pattern of profile.patterns) {
        if (mfrLower.includes(pattern.toLowerCase()) || mfr.includes(pattern)) {
          this.log(`[MOTION-DP] 🎯 Matched profile: ${profileName} (pattern: ${pattern})`);
          return { name: profileName, ...profile };
        }
      }
    }
    
    // Default profile
    this.log('[MOTION-DP] ℹ️ Using default DP profile');
    return { name: 'DEFAULT', dp4: 'measure_battery', dp5: 'measure_temperature', 
             dp6: 'measure_humidity', dp5_divisor: 10, dp6_divisor: 1 };
  }

  /**
   * v5.5.925: DYNAMIC CAPABILITY ADDITION for variant devices
   * Called when DP reports temp/humidity - adds capability if not present
   * This allows ZG-204ZV variants to get temp/humidity even with same manufacturerName as ZG-204ZL
   */
  async _dynamicCapabilityFromDP(dpId, value, capabilityName) {
    // Only for variant devices in permissive mode
    if (!this._isVariantDevice) return;
    
    // Skip invalid values
    if (value === null || value === undefined) return;
    
    // Track which DPs we've received
    if (capabilityName === 'measure_temperature') {
      this._hasReceivedTempDP = true;
    } else if (capabilityName === 'measure_humidity') {
      this._hasReceivedHumidityDP = true;
    }
    
    // Add capability if not present
    if (!this.hasCapability(capabilityName)) {
      try {
        await this.addCapability(capabilityName);
        this.log(`[MOTION-DYNAMIC] ✅ Added ${capabilityName} from DP${dpId} (variant device)`);
      } catch (err) {
        this.log(`[MOTION-DYNAMIC] ⚠️ Failed to add ${capabilityName}:`, err.message);
      }
    }
  }

  get dpMappings() {
    const profile = this._getManufacturerProfile();
    const device = this; // Reference for dynamic capability addition
    
    // Base mappings (common to all)
    const mappings = {
      // ═══════════════════════════════════════════════════════════════════
      // MOTION / OCCUPANCY (universal)
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      101: { capability: 'measure_battery', transform: (v) => {
        if (v >= 0 && v <= 100) return v;
        return null; // Skip if >100 (likely presence_time)
      }},

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (universal fallbacks)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // LUMINANCE (universal)
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_luminance', divisor: 1 },
      9: { capability: 'measure_luminance', divisor: 1 },
      12: { capability: 'measure_luminance', divisor: 1 },
      106: { capability: 'measure_luminance', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // ALTERNATE TEMP/HUMIDITY DPs (some models)
      // v5.5.925: Added dynamic capability addition for variant devices
      // ═══════════════════════════════════════════════════════════════════
      18: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(18, v, 'measure_temperature');
          return (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null;
        }
      },
      19: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(19, v, 'measure_humidity');
          return (v >= 0 && v <= 100) ? Math.round(v) : null;
        }
      },
      103: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(103, v, 'measure_temperature');
          return (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null;
        }
      },
      104: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(104, v, 'measure_humidity');
          return (v >= 0 && v <= 100) ? Math.round(v) : null;
        }
      },
    };

    // ═══════════════════════════════════════════════════════════════════
    // v5.5.753: MANUFACTURER-SPECIFIC DP4, DP5, DP6, DP102 MAPPINGS
    // ═══════════════════════════════════════════════════════════════════
    
    // DP4 - varies by manufacturer
    if (profile.dp4 === 'measure_temperature') {
      mappings[4] = {
        capability: 'measure_temperature',
        divisor: profile.dp4_divisor || 10,
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      };
    } else if (profile.dp4 === 'measure_humidity') {
      // v5.5.991: HOBEIAN ZG-204ZV humidity needs *10 multiplier (Peter_van_Werkhoven)
      const multiplier = profile.dp4_multiplier || 1;
      mappings[4] = {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(4, v, 'measure_humidity');
          const hum = v * multiplier;
          return (hum >= 0 && hum <= 100) ? Math.round(hum) : null;
        }
      };
    } else if (profile.dp4 === 'measure_battery') {
      mappings[4] = { capability: 'measure_battery', divisor: 1 };
    } else if (profile.dp4 === 'internal_distance') {
      mappings[4] = { 
        capability: null, 
        internal: 'detection_distance',
        transform: (v) => v / 100 // Convert to meters
      };
    }

    // DP5 - varies by manufacturer
    // v5.5.925: Added dynamic capability for variant devices
    if (profile.dp5 === 'measure_humidity') {
      mappings[5] = {
        capability: 'measure_humidity',
        divisor: profile.dp5_divisor || 1,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(5, v, 'measure_humidity');
          return (v >= 0 && v <= 100) ? Math.round(v) : null;
        }
      };
    } else if (profile.dp5 === 'measure_temperature') {
      mappings[5] = {
        capability: 'measure_temperature',
        divisor: profile.dp5_divisor || 10,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(5, v, 'measure_temperature');
          return (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null;
        }
      };
    }

    // DP6 - humidity for some models
    // v5.5.925: Added dynamic capability for variant devices
    if (profile.dp6 === 'measure_humidity') {
      mappings[6] = {
        capability: 'measure_humidity',
        divisor: profile.dp6_divisor || 1,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(6, v, 'measure_humidity');
          return (v >= 0 && v <= 100) ? Math.round(v) : null;
        }
      };
    }

    // DP102 - lux for Fantem, fading_time for radar
    if (profile.dp102 === 'measure_luminance') {
      mappings[102] = { capability: 'measure_luminance', divisor: 1 };
    } else if (profile.dp102 === 'internal_fading_time') {
      mappings[102] = { capability: null, internal: 'fading_time' };
    } else {
      // Default: Fantem lux
      mappings[102] = { capability: 'measure_luminance', divisor: 1 };
    }

    // v5.5.991: ZG-204ZV specific DP mappings (Peter_van_Werkhoven forum)
    if (profile.dp3 === 'measure_temperature') {
      mappings[3] = {
        capability: 'measure_temperature',
        divisor: profile.dp3_divisor || 10,
        transform: (v) => {
          device._dynamicCapabilityFromDP?.(3, v, 'measure_temperature');
          const temp = v / (profile.dp3_divisor || 10);
          return (temp >= -40 && temp <= 80) ? Math.round(temp * 10) / 10 : null;
        }
      };
    }
    if (profile.dp9 === 'measure_luminance') {
      mappings[9] = { capability: 'measure_luminance', divisor: 1 };
    }
    if (profile.dp12 === 'measure_battery') {
      mappings[12] = { capability: 'measure_battery', divisor: 1 };
    }

    return mappings;
  }


  /**
   * v5.5.86: ZCL cluster handlers for 4-in-1 multisensors
   * These sensors report via standard ZCL clusters (0x0402, 0x0405)
   */
  get clusterHandlers() {
    return {
      // Temperature cluster (0x0402) - v5.5.107: Add sanity check
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== -32768) {
            let temp = Math.round((data.measuredValue / 100) * 10) / 10;
            // v5.5.793: Use validation constants
            if (temp >= VALIDATION.TEMP_MIN && temp <= VALIDATION.TEMP_MAX) {
              // v5.5.793: Apply calibration offset if available
              const offset = this.getSetting?.('temp_offset') || 0;
              temp = Math.round((temp + offset) * 10) / 10;
              this.log(`[ZCL] 🌡️ Temperature: ${temp}°C (raw: ${data.measuredValue})`);
              this._registerZigbeeHit?.();
              this._lastTempSource = 'ZCL';
              // v5.8.7: Permissive - auto-add capability from ZCL data
              if (!this.hasCapability('measure_temperature'))
                this.addCapability('measure_temperature').catch(() => {});
              this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
            } else {
              this.log(`[ZCL] ⚠️ Temperature out of range: ${temp}°C (raw: ${data.measuredValue})`);
            }
          }
        }
      },

      // Humidity cluster (0x0405) - v5.5.107: Add sanity check
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== 65535) {
            let hum = Math.round(data.measuredValue / 100);
            // v5.5.793: Auto-detect divisor for devices reporting 0-1000 scale
            if (hum > VALIDATION.HUMIDITY_AUTO_DIVISOR_THRESHOLD) {
              hum = Math.round(hum / 10);
            }
            // v5.5.793: Use validation constants
            if (hum >= VALIDATION.HUMIDITY_MIN && hum <= VALIDATION.HUMIDITY_MAX) {
              // v5.5.793: Apply calibration offset if available
              const offset = this.getSetting?.('humidity_offset') || 0;
              hum = Math.max(0, Math.min(100, Math.round(hum + offset)));
              this.log(`[ZCL] 💧 Humidity: ${hum}% (raw: ${data.measuredValue})`);
              this._registerZigbeeHit?.();
              this._lastHumSource = 'ZCL';
              // v5.8.7: Permissive - auto-add capability from ZCL data
              if (!this.hasCapability('measure_humidity'))
                this.addCapability('measure_humidity').catch(() => {});
              this.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(() => { });
            } else {
              this.log(`[ZCL] ⚠️ Humidity out of range: ${hum}% (raw: ${data.measuredValue})`);
            }
          }
        }
      },

      // Illuminance cluster (0x0400)
      illuminanceMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            let lux = Math.round(Math.pow(10, (data.measuredValue - 1) / 10000));
            // v5.5.793: Validate lux range
            if (lux >= VALIDATION.LUX_MIN && lux <= VALIDATION.LUX_MAX) {
              this.log(`[ZCL] 💡 Luminance: ${lux} lux`);
              this._registerZigbeeHit?.();
              // v5.8.7: Permissive - auto-add capability from ZCL data
              if (!this.hasCapability('measure_luminance'))
                this.addCapability('measure_luminance').catch(() => {});
              this.setCapabilityValue('measure_luminance', parseFloat(lux)).catch(() => { });

              // v5.5.317: Feed lux to motion inference engine
              this._handleLuxForMotionInference(lux);
            } else {
              this.log(`[ZCL] ⚠️ Luminance out of range: ${lux} lux`);
            }
          }
        }
      },

      // Battery cluster (0x0001)
      // v5.5.366: Added throttling to prevent battery spam (4x4_Pete forum #851)
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            // v5.5.366: Throttle battery reports to prevent spam
            const now = Date.now();
            const lastBatteryReport = this._lastBatteryReportTime || 0;
            const throttleMs = MotionSensorDevice.BATTERY_THROTTLE_MS;

            if (now - lastBatteryReport < throttleMs) {
              // Suppress frequent battery reports
              return;
            }
            this._lastBatteryReportTime = now;

            let battery = Math.round(data.batteryPercentageRemaining / 2);
            // v5.5.317: Validate battery with inference
            battery = this._batteryInference?.validateBattery(battery) ?? battery;
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this._registerZigbeeHit?.();
            // v5.8.7: Permissive - auto-add capability from ZCL data
            if (!this.hasCapability('measure_battery'))
              this.addCapability('measure_battery').catch(() => {});
            this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.5.228: Remove alarm_contact if wrongly added (motion sensors use alarm_motion only)
    if (this.hasCapability('alarm_contact')) {
      await this.removeCapability('alarm_contact').catch(() => { });
      this.log('[MOTION] ⚠️ Removed incorrect alarm_contact capability');
    }

    // v5.5.892: FORUM FIX (Peter_van_Werkhoven #1211)
    // Remove "distance" capability that was incorrectly showing on ZG-204ZV
    // Distance is only for radar sensors (ZG-204ZM), not PIR multisensors
    const orphanCaps = ['measure_distance', 'distance', 'internal_distance', 'detection_distance'];
    for (const cap of orphanCaps) {
      if (this.hasCapability(cap)) {
        await this.removeCapability(cap).catch(() => { });
        this.log(`[MOTION] ⚠️ Removed orphan capability: ${cap}`);
      }
    }

    // v5.5.113: Detect available clusters BEFORE super.onNodeInit
    // This adds temp/humidity capabilities only if clusters exist
    await this._detectAvailableClusters(zclNode);

    // v5.5.919: FORUM FIX (Peter_van_Werkhoven #1225)
    // For TS0601 Tuya DP multisensors like ZG-204ZV, add capabilities based on profile
    // These don't have ZCL clusters but send temp/humidity via Tuya DPs
    await this._ensureTuyaDPCapabilities();

    await super.onNodeInit({ zclNode });

    // v5.8.28: CRITICAL FIX - IAS Zone enrollment (Lasse_K forum 'inactivated' fix)
    try {
      const iasManager = new IASZoneManager(this);
      await iasManager.enrollIASZone();
    } catch (e) {
      this.log(`[MOTION] ⚠️ IAS enrollment error (non-critical): ${e.message}`);
    }

    // v5.5.299: Initialize sleepy device state tracking
    this._isDeviceAwake = false;
    this._lastWakeTime = 0;
    this._pendingZclReads = new Set();

    // v5.5.317: Initialize intelligent inference engines
    this._motionLuxInference = new MotionLuxInference(this, {
      luxChangeThreshold: 8,      // 8% change triggers motion inference
      motionHoldTime: 60000,      // Hold motion for 60s
      luxActivityWindow: 5000     // 5s window for activity detection
    });
    this._batteryInference = new BatteryInference(this);
    this._useMotionInference = false; // Enable after detecting PIR issues
    this._pirFailCount = 0;

    // v5.5.355: SMART LUX REPORTING - Independent luminance updates
    this._luxSmartReporting = {
      lastLuxValue: null,
      lastLuxTime: 0,
      luxReportInterval: 5 * 60 * 1000, // 5 minutes base interval
      luxChangeThreshold: 10, // 10% change threshold
      forceReportInterval: 30 * 60 * 1000, // Force report every 30 minutes
      enabled: this.getSetting('smart_lux_reporting') !== false
    };

    // Start smart lux reporting timer
    this._startSmartLuxReporting();

    // v5.5.18: Explicit IAS Zone setup for HOBEIAN and other non-Tuya motion sensors
    await this._setupMotionIASZone(zclNode);

    // v5.5.930: DP POLLING for HOBEIAN Multisensor (Peter_van_Werkhoven #1253)
    // Request temp/humidity/battery DPs for TS0601 devices that don't send automatically
    await this._setupTuyaDPPolling(zclNode);

    // v5.5.292: Flow triggers now handled by HybridSensorBase._triggerCustomFlowsIfNeeded()
    // v5.8.8: For ZCL-only variants, bind clusters so device sends reports to Homey
    if (this._isZclOnlyVariant) {
      const ep1 = zclNode?.endpoints?.[1];
      if (ep1) {
        for (const cName of ['iasZone', 'ssIasZone', 'powerConfiguration', 'genPowerCfg',
          'illuminanceMeasurement', 'msIlluminanceMeasurement']) {
          const cl = ep1.clusters?.[cName];
          if (cl?.bind) { cl.bind().catch(() => {}); }
        }
        this.log('[MOTION] 📡 ZCL-only variant: non-blocking cluster binding initiated');
      }
    }

    this.log('[MOTION] v5.8.8 ✅ Motion sensor ready');
    this.log('[MOTION] Manufacturer:', this.getSetting('zb_manufacturer_name') || 'unknown');
    this.log(`[MOTION] Clusters: temp=${this._hasTemperatureCluster}, hum=${this._hasHumidityCluster}, lux=${this._hasIlluminanceCluster}, batt=${this._hasPowerConfigCluster}`);
    if (this._isZclOnlyVariant) this.log('[MOTION] ⚡ ZCL-only variant active');
  }

  /**
   * v5.5.335: Manufacturer IDs that DON'T have temp/humidity (PIR only + luminance)
   * Per forum feedback from 4x4_Pete: _TZE200_3towulqd shows incorrect temp/humidity
   * These devices should only show: motion, luminance, battery
   * v5.5.353: Added battery report throttling for ZG-204ZM to prevent spam
   */
  /**
   * v5.5.366: Battery report throttling interval (minimum ms between reports)
   * Prevents "battery spam" on devices that report battery with every DP
   */
  static get BATTERY_THROTTLE_MS() {
    return 300000;  // 5 minutes minimum between battery updates
  }

  static get PIR_ONLY_MANUFACTURERS() {
    // v5.5.925: PERMISSIVE MODE (Peter_van_Werkhoven forum feedback)
    // REMOVED _TZE200_3towulqd from this list!
    // Reason: Some variants (ZG-204ZV) with SAME manufacturerName DO have temp/humidity
    // Solution: Don't block capabilities upfront - add them dynamically when DPs are received
    // This handles variants with same manufacturerName but different capabilities
    return [
      // v5.5.925: Only block devices we're 100% CERTAIN have no temp/humidity
      // Empty for now - use dynamic detection instead
      // '_TZE200_bh3n6gk8',  // Confirmed PIR-only (no variants known)
    ];
  }

  /**
   * v5.5.925: PERMISSIVE VARIANT DETECTION (Peter_van_Werkhoven)
   * Some manufacturerNames have MULTIPLE variants with different capabilities:
   * - _TZE200_3towulqd can be ZG-204ZL (PIR only) OR ZG-204ZV (with temp/humidity)
   * These are handled dynamically - capabilities added when DPs are received
   */
  static get VARIANT_MANUFACTURERS() {
    return [
      '_TZE200_3towulqd',  // Can be ZG-204ZL (PIR) or ZG-204ZV (multisensor)
      '_tze200_3towulqd',
      '_TZE204_3towulqd',
      '_TZE200_1ibpyhdc',  // Has variants
      '_tze200_1ibpyhdc',
      'HOBEIAN',           // v5.8.53: Brand name used as manufacturerName on some models (ZG-204ZM etc.)
      'hobeian',
      'Hobeian',
    ];
  }

  /**
   * v5.5.113: Cluster detection AND dynamic capability addition
   * Only add temp/humidity capabilities if device actually has these clusters
   * Fixes "incorrect labels" issue (Cam's report #604)
   * v5.5.925: PERMISSIVE MODE - Don't remove capabilities for variant manufacturers
   */
  async _detectAvailableClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const clusters = ep1?.clusters || {};
    const clusterNames = Object.keys(clusters);

    this.log(`[MOTION-CLUSTERS] Available clusters: ${clusterNames.join(', ')}`);

    // v5.5.925: Check if this is a variant manufacturer (may have temp/humidity)
    // v5.8.53: Use comprehensive fallback chain (matching _getManufacturerProfile fix)
    const manufacturerName = this.getSetting?.('zb_manufacturer_name')
      || this.getSetting?.('zb_manufacturerName')
      || this.getStoreValue?.('manufacturerName')
      || this.getData()?.manufacturerName || '';
    const isVariant = MotionSensorDevice.VARIANT_MANUFACTURERS.some(v => 
      manufacturerName.toLowerCase().includes(v.toLowerCase())
    );
    const isPirOnly = MotionSensorDevice.PIR_ONLY_MANUFACTURERS.includes(manufacturerName);

    // v5.5.925: For variant manufacturers, DON'T remove capabilities
    // Let dynamic DP detection handle it
    // v5.8.32: BUT only if Tuya DP cluster (0xEF00) exists! Without it, DPs will never arrive
    if (isVariant) {
      const hasTuyaCluster = !!(clusters[61184] || clusters['61184'] || clusters['0xEF00'] || clusters.manuSpecificTuya);
      if (hasTuyaCluster) {
        this.log(`[MOTION-CLUSTERS] 🔀 VARIANT device WITH Tuya DP cluster: ${manufacturerName}`);
        this.log('[MOTION-CLUSTERS] Using PERMISSIVE mode - capabilities will be added dynamically from DPs');
        this._isVariantDevice = true;
      } else {
        this.log(`[MOTION-CLUSTERS] 🔀 VARIANT device WITHOUT Tuya DP cluster: ${manufacturerName}`);
        this.log('[MOTION-CLUSTERS] ZCL-only variant - using cluster-based detection');
        this._isVariantDevice = false;
        this._isZclOnlyVariant = true;
        // Fall through to normal cluster detection below
      }
    } else if (isPirOnly) {
      this.log(`[MOTION-CLUSTERS] ⚠️ Confirmed PIR-only device: ${manufacturerName}`);
      this._hasTemperatureCluster = false;
      this._hasHumidityCluster = false;
      // Only remove if NOT a variant
      if (this.hasCapability('measure_temperature')) {
        await this.removeCapability('measure_temperature').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Removed measure_temperature (confirmed PIR-only)');
      }
      if (this.hasCapability('measure_humidity')) {
        await this.removeCapability('measure_humidity').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Removed measure_humidity (confirmed PIR-only)');
      }
      return;
    }

    // Check for temperature cluster (0x0402) - ALL possible names
    this._hasTemperatureCluster = !!(
      clusters.temperatureMeasurement ||
      clusters.msTemperatureMeasurement ||
      clusters.genTemperatureMeasurement ||
      clusters[0x0402] ||
      clusters['0x0402'] ||
      clusters['1026']
    );

    // Check for humidity cluster (0x0405) - ALL possible names
    this._hasHumidityCluster = !!(
      clusters.relativeHumidity ||
      clusters.relativeHumidityMeasurement ||
      clusters.msRelativeHumidity ||
      clusters.genRelativeHumidity ||
      clusters[0x0405] ||
      clusters['0x0405'] ||
      clusters['1029']
    );

    // v5.8.8: Check for illuminance cluster (0x0400 / 1024) - _TZE200_3towulqd ZCL-only variant
    this._hasIlluminanceCluster = !!(
      clusters.illuminanceMeasurement ||
      clusters.msIlluminanceMeasurement ||
      clusters[0x0400] ||
      clusters['0x0400'] ||
      clusters['1024']
    );

    // v5.8.8: Check for powerConfiguration cluster (0x0001 / 1) for battery
    this._hasPowerConfigCluster = !!(
      clusters.powerConfiguration ||
      clusters.genPowerCfg ||
      clusters[0x0001] ||
      clusters['0x0001'] ||
      clusters['1']
    );

    // v5.5.113: DYNAMICALLY add capabilities ONLY if clusters detected
    // This prevents "incorrect labels" for simple PIR motion sensors
    if (this._hasTemperatureCluster) {
      if (!this.hasCapability('measure_temperature')) {
        await this.addCapability('measure_temperature').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_temperature (cluster detected)');
      }
    }

    if (this._hasHumidityCluster) {
      if (!this.hasCapability('measure_humidity')) {
        await this.addCapability('measure_humidity').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_humidity (cluster detected)');
      }
    }

    // v5.8.8: Add illuminance capability if cluster detected (ZCL-only variants)
    if (this._hasIlluminanceCluster) {
      if (!this.hasCapability('measure_luminance')) {
        await this.addCapability('measure_luminance').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_luminance (illuminanceMeasurement cluster detected)');
      }
    }

    // v5.8.8: Add battery capability if powerConfiguration cluster detected
    if (this._hasPowerConfigCluster) {
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_battery (powerConfiguration cluster detected)');
      }
    }

    // v5.8.32: Remove stale capabilities from previous versions
    // Only for non-variant devices (variants wait for Tuya DP data)
    if (!this._isVariantDevice) {
      if (!this._hasTemperatureCluster && this.hasCapability('measure_temperature')) {
        await this.removeCapability('measure_temperature').catch(() => {});
        this.log('[MOTION-CLUSTERS] 🗑️ Removed stale measure_temperature (no cluster, not variant)');
      }
      if (!this._hasHumidityCluster && this.hasCapability('measure_humidity')) {
        await this.removeCapability('measure_humidity').catch(() => {});
        this.log('[MOTION-CLUSTERS] 🗑️ Removed stale measure_humidity (no cluster, not variant)');
      }
    }

    this.log(`[MOTION-CLUSTERS] Temperature ZCL: ${this._hasTemperatureCluster}`);
    this.log(`[MOTION-CLUSTERS] Humidity ZCL: ${this._hasHumidityCluster}`);
    this.log(`[MOTION-CLUSTERS] Illuminance ZCL: ${this._hasIlluminanceCluster}`);
    this.log(`[MOTION-CLUSTERS] PowerConfig ZCL: ${this._hasPowerConfigCluster}`);
    if (this._isZclOnlyVariant) {
      this.log('[MOTION-CLUSTERS] ⚡ ZCL-only variant (no Tuya DP) - using ZCL clusters for all data');
    }
  }

  /**
   * v5.5.925: PERMISSIVE MODE (Peter_van_Werkhoven forum feedback)
   * DON'T remove capabilities for variant devices - add dynamically from DPs
   * This handles ZG-204ZL vs ZG-204ZV with same manufacturerName
   */
  async _ensureTuyaDPCapabilities() {
    const profile = this._getManufacturerProfile();
    
    // v5.5.992: PERMISSIVE_VARIANT profile - add all possible capabilities upfront
    // This handles ZG-204ZV with temp/humidity vs ZG-204ZL (PIR only)
    if (profile.isPermissive || profile.name === 'PERMISSIVE_VARIANT') {
      this.log('[MOTION-DP] 🔀 PERMISSIVE mode - adding all multisensor capabilities');
      
      // Add all capabilities that might be present (device will populate from DPs)
      if (!this.hasCapability('measure_temperature')) {
        await this.addCapability('measure_temperature').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_temperature (permissive)');
      }
      if (!this.hasCapability('measure_humidity')) {
        await this.addCapability('measure_humidity').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_humidity (permissive)');
      }
      if (!this.hasCapability('measure_luminance')) {
        await this.addCapability('measure_luminance').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_luminance (permissive)');
      }
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_battery (permissive)');
      }

      // v5.8.32: Delayed cleanup - remove temp/humidity if no DP data received in 5 min
      // Fixes PIR-only variants (e.g. _TZE200_3towulqd ZG-204ZL) showing bogus values
      this._permissiveCleanupTimeout = this.homey.setTimeout(async () => {
        try {
          if (!this._hasReceivedTempDP && this.hasCapability('measure_temperature')) {
            const val = this.getCapabilityValue('measure_temperature');
            if (val === 0 || val === null) {
              await this.removeCapability('measure_temperature').catch(() => {});
              this.log('[MOTION-DP] 🗑️ Permissive cleanup: removed measure_temperature (no DP in 5min)');
            }
          }
          if (!this._hasReceivedHumidityDP && this.hasCapability('measure_humidity')) {
            const val = this.getCapabilityValue('measure_humidity');
            if (val === 0 || val === null || val === 10) {
              await this.removeCapability('measure_humidity').catch(() => {});
              this.log('[MOTION-DP] 🗑️ Permissive cleanup: removed measure_humidity (no DP in 5min)');
            }
          }
        } catch (e) {
          this.log('[MOTION-DP] ⚠️ Permissive cleanup error:', e.message);
        }
      }, 5 * 60 * 1000);

      return;
    }
    
    // v5.5.925: For variant devices, DON'T remove capabilities
    // They will be added dynamically when DPs are received
    if (this._isVariantDevice) {
      this.log('[MOTION-DP] 🔀 VARIANT mode - skipping capability removal');
      this.log('[MOTION-DP] Capabilities will be added when DPs report temp/humidity');
      // Ensure battery is present (all variants have battery)
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_battery (universal)');
      }
      return;
    }
    
    // v5.5.925: Only remove for CONFIRMED PIR-only (non-variant) devices
    if (profile.isPirOnly && profile.name === 'ZG204ZL_PIR_ONLY' && !this._isVariantDevice) {
      this.log('[MOTION-DP] 🔧 Confirmed PIR-only device - checking capabilities');
      // Even for PIR-only, don't remove if device has reported these DPs
      if (!this._hasReceivedTempDP) {
        if (this.hasCapability('measure_temperature')) {
          await this.removeCapability('measure_temperature').catch(() => {});
          this.log('[MOTION-DP] ❌ Removed measure_temperature (no DP received)');
        }
      }
      if (!this._hasReceivedHumidityDP) {
        if (this.hasCapability('measure_humidity')) {
          await this.removeCapability('measure_humidity').catch(() => {});
          this.log('[MOTION-DP] ❌ Removed measure_humidity (no DP received)');
        }
      }
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_battery (Tuya DP4)');
      }
      return;
    }

    // FANTEM/IMMAX profiles: DP5=temp, DP6=humidity, DP4=battery
    if (profile.name === 'FANTEM' || profile.name === 'IMMAX') {
      this.log(`[MOTION-DP] 🌡️ ${profile.name} detected - adding Tuya DP capabilities`);
      
      if (!this.hasCapability('measure_temperature')) {
        await this.addCapability('measure_temperature').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_temperature (Tuya DP5)');
      }
      if (!this.hasCapability('measure_humidity')) {
        await this.addCapability('measure_humidity').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_humidity (Tuya DP6)');
      }
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[MOTION-DP] ✅ Added measure_battery (Tuya DP4)');
      }
    }
  }

  /**
   * v5.5.18: Setup IAS Zone for motion detection
   * Required for HOBEIAN ZG-204ZM and similar non-Tuya sensors
   */
  async _setupMotionIASZone(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

      if (!iasCluster) {
        this.log('[MOTION-IAS] No IAS Zone cluster');
        return;
      }

      this.log('[MOTION-IAS] IAS Zone cluster found - setting up motion detection');

      // v5.5.517: Handle Zone Enroll Request from device (NoroddH fix for _TZ321C_fkzihax8)
      iasCluster.onZoneEnrollRequest = async (payload) => {
        this.log('[MOTION-IAS] 📥 Zone Enroll Request received:', payload);
        try {
          await iasCluster.zoneEnrollResponse({
            enrollResponseCode: 0, // Success
            zoneId: 23
          });
          this.log('[MOTION-IAS] ✅ Zone Enroll Response sent (device-initiated)');
        } catch (err) {
          this.log('[MOTION-IAS] Zone enroll response error:', err.message);
        }
      };

      // v5.5.517: Try to write CIE address for proper enrollment
      try {
        const homeyIeeeAddress = this.homey.zigbee?.getNetwork?.()?.ieeeAddress;
        if (homeyIeeeAddress) {
          await iasCluster.writeAttributes({ iasCieAddress: homeyIeeeAddress });
          this.log('[MOTION-IAS] ✅ CIE address written:', homeyIeeeAddress);
        }
      } catch (cieErr) {
        this.log('[MOTION-IAS] CIE address write (normal if already set):', cieErr.message);
      }

      // Zone Status Change Notification (motion detected)
      iasCluster.onZoneStatusChangeNotification = (payload) => {
        // v5.5.299: Mark device as awake on ANY motion event
        this._markDeviceAwake();

        // v5.5.17: Use universal parser from HybridSensorBase
        const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
        let motion = parsed.alarm1 || parsed.alarm2;

        // v5.5.840: FORUM FIX - Apply invert_presence setting for ZG-204ZL and similar
        // Some sensors report inverted motion values (always active or never active)
        const invertSetting = this.getSetting?.('invert_presence');
        if (invertSetting) {
          motion = !motion;
          this.log(`[IAS] 🔄 Motion inversion applied: ${parsed.alarm1 || parsed.alarm2} → ${motion}`);
        }

        this.log(`[ZCL-DATA] motion_sensor.ias_zone raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2} → motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }

        // v5.5.18: Trigger flow card
        if (motion && this.driver?.motionTrigger) {
          this.driver.motionTrigger.trigger(this, {}, {}).catch(this.error);
        }

        // v5.5.104: Read temp/humidity NOW while device is awake (Peter's 4-in-1 fix)
        // v5.5.299: Enhanced with smart wake detection
        if (motion) {
          this._readTempHumidityWhileAwake(zclNode);
        }
      };

      // Attribute listener for zone status
      iasCluster.on('attr.zoneStatus', (status) => {
        // v5.5.299: Mark device as awake on zone status changes
        this._markDeviceAwake();

        let motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        
        // v5.5.840: FORUM FIX - Apply invert_presence setting
        const invertSetting = this.getSetting?.('invert_presence');
        if (invertSetting) {
          motion = !motion;
          this.log(`[IAS] 🔄 Motion inversion applied: ${((status & 0x01) !== 0 || (status & 0x02) !== 0)} → ${motion}`);
        }
        
        this.log(`[ZCL-DATA] motion_sensor.zone_status raw=${status} → alarm_motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }

        // v5.5.104: Also read temp/humidity on this event
        // v5.5.299: Enhanced with smart wake detection
        if (motion) {
          this._readTempHumidityWhileAwake(zclNode);
        }
      });

      // Send Zone Enroll Response
      try {
        await iasCluster.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 23
        });
        this.log('[MOTION-IAS] ✅ Zone Enroll Response sent');
      } catch (e) {
        this.log('[MOTION-IAS] Zone enroll (normal if already enrolled):', e.message);
      }

      this.log('[MOTION-IAS] ✅ Motion detection via IAS Zone configured');
    } catch (err) {
      this.log('[MOTION-IAS] Setup error:', err.message);
    }
  }

  /**
   * v5.5.930: TUYA DP POLLING for HOBEIAN Multisensor (Peter_van_Werkhoven #1253)
   * Request temp/humidity/battery DPs for TS0601 devices that don't send automatically
   * ZG-204ZV DPs: DP1=motion, DP3=temp(/10), DP4=humidity, DP9=lux, DP12=battery
   */
  async _setupTuyaDPPolling(zclNode) {
    // v5.8.53: Use comprehensive fallback chain
    const mfr = this.getSetting?.('zb_manufacturer_name')
      || this.getSetting?.('zb_manufacturerName')
      || this.getStoreValue?.('manufacturerName')
      || this.getData()?.manufacturerName || '';
    const modelId = this.getSetting?.('zb_model_id')
      || this.getSetting?.('zb_modelId')
      || this.getStoreValue?.('modelId')
      || this.getData()?.modelId || '';
    
    // Only for TS0601 Tuya DP devices (variants that may have temp/humidity)
    const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');
    if (!isTuyaDP) {
      this.log('[MOTION-DP] Not a Tuya DP device, skipping DP polling');
      return;
    }

    // Check if this is a variant manufacturer (may have temp/humidity)
    const isVariant = MotionSensorDevice.VARIANT_MANUFACTURERS.some(v => 
      mfr.toLowerCase().includes(v.toLowerCase())
    );
    
    this.log(`[MOTION-DP] 🔄 Setting up DP polling for ${mfr} (variant=${isVariant})`);

    const ep1 = zclNode?.endpoints?.[1];
    const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
    if (!tuyaCluster) {
      this.log('[MOTION-DP] No Tuya cluster found');
      return;
    }

    // Request specific DPs for HOBEIAN Multisensor variants
    const requestDP = async (dpId) => {
      try {
        if (tuyaCluster.dataRequest) {
          await tuyaCluster.dataRequest({ dp: dpId });
          this.log(`[MOTION-DP] 📡 Requested DP${dpId}`);
        } else if (tuyaCluster.sendData) {
          const payload = Buffer.alloc(3);
          payload.writeUInt16BE(0, 0); // seq
          payload.writeUInt8(dpId, 2); // dp
          await tuyaCluster.sendData({ dp: dpId, datatype: 0, data: Buffer.from([]) });
          this.log(`[MOTION-DP] 📡 Requested DP${dpId} (alt)`);
        }
      } catch (e) { /* ignore */ }
    };

    // Initial poll after 3 seconds
    setTimeout(async () => {
      this.log('[MOTION-DP] 🔄 Initial DP poll...');
      // Request all DPs that might contain temp/humidity/battery
      await requestDP(3);   // Temperature (ZG-204ZV)
      await requestDP(4);   // Humidity or Battery
      await requestDP(5);   // Temperature (Fantem)
      await requestDP(6);   // Humidity (Fantem)
      await requestDP(9);   // Luminance
      await requestDP(12);  // Battery (some variants)
      
      // Also try generic DP refresh
      if (tuyaCluster.dataQuery) {
        await tuyaCluster.dataQuery().catch(() => {});
        this.log('[MOTION-DP] 📡 Generic DP refresh requested');
      }
    }, 3000);

    // Periodic poll every 5 minutes for variant devices
    if (isVariant) {
      this._dpPollingInterval = setInterval(async () => {
        this.log('[MOTION-DP] 🔄 Periodic DP poll...');
        await requestDP(3);  // Temperature
        await requestDP(4);  // Humidity
        await requestDP(12); // Battery
      }, 5 * 60 * 1000);
    }
  }

  /**
   * v5.5.107: ENHANCED temp/humidity reading with ALL cluster name variants
   * This is crucial for 4-in-1 multisensors (Fantem ZB003-x, Immax 07502L)
   * which only respond to ZCL reads when awake (after motion detection)
   */
  async _readTempHumidityWhileAwake(zclNode) {
    // Debounce - don't spam reads
    if (this._lastTempHumRead && Date.now() - this._lastTempHumRead < 3000) {
      return;
    }
    this._lastTempHumRead = Date.now();

    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = ep1.clusters || {};
    this.log('[MOTION-AWAKE] 🌡️ Device awake - reading temp/humidity NOW');
    this.log(`[MOTION-AWAKE] Available clusters: ${Object.keys(clusters).join(', ')}`);

    // v5.5.107: Find temperature cluster with ALL possible names
    const tempCluster =
      clusters.temperatureMeasurement ||
      clusters.msTemperatureMeasurement ||
      clusters.genTemperatureMeasurement ||
      clusters[0x0402] ||
      clusters['0x0402'] ||
      clusters['1026'];

    if (tempCluster?.readAttributes) {
      try {
        this.log('[MOTION-AWAKE] 🌡️ Smart temperature read while device is awake...');
        const data = await this._smartZclRead(tempCluster, ['measuredValue'], 3000);
        if (data?.measuredValue !== undefined && data.measuredValue !== -32768 && data.measuredValue !== 0x8000) {
          const temp = Math.round((data.measuredValue / 100) * 10) / 10;
          this.log(`[MOTION-AWAKE] 🌡️ Temperature: ${temp}°C (raw: ${data.measuredValue})`);
          // Auto-add capability if needed
          if (!this.hasCapability('measure_temperature')) {
            await this.addCapability('measure_temperature').catch(() => { });
          }
          await this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
        } else {
          this.log(`[MOTION-AWAKE] Temperature invalid: ${data?.measuredValue}`);
        }
      } catch (e) {
        this.log('[MOTION-AWAKE] Temperature read failed (device may have gone to sleep):', e.message);
      }
    } else {
      this.log('[MOTION-AWAKE] No temperature cluster found');
    }

    // v5.5.107: Find humidity cluster with ALL possible names
    const humCluster =
      clusters.relativeHumidity ||
      clusters.relativeHumidityMeasurement ||
      clusters.msRelativeHumidity ||
      clusters.genRelativeHumidity ||
      clusters[0x0405] ||
      clusters['0x0405'] ||
      clusters['1029'];

    if (humCluster?.readAttributes) {
      try {
        this.log('[MOTION-AWAKE] 💧 Smart humidity read while device is awake...');
        const data = await this._smartZclRead(humCluster, ['measuredValue'], 3000);
        if (data?.measuredValue !== undefined && data.measuredValue !== 65535 && data.measuredValue !== 0xFFFF) {
          const hum = Math.round(data.measuredValue / 100);
          this.log(`[MOTION-AWAKE] 💧 Humidity: ${hum}% (raw: ${data.measuredValue})`);
          // Auto-add capability if needed
          if (!this.hasCapability('measure_humidity')) {
            await this.addCapability('measure_humidity').catch(() => { });
          }
          await this.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(() => { });
        } else {
          this.log(`[MOTION-AWAKE] Humidity invalid: ${data?.measuredValue}`);
        }
      } catch (e) {
        this.log('[MOTION-AWAKE] Humidity read failed (device may have gone to sleep):', e.message);
      }
    } else {
      this.log('[MOTION-AWAKE] No humidity cluster found');
    }

    // Also try to configure reporting for future passive updates
    this._configureReportingOnce(ep1);

    // v5.5.111: Also read battery while awake!
    await this._readBatteryWhileAwake(zclNode);
  }

  /**
   * v5.5.299: Smart wake state management
   * Tracks device wake state to optimize ZCL communication
   */
  _markDeviceAwake() {
    this._isDeviceAwake = true;
    this._lastWakeTime = Date.now();
    this.log('[SLEEPY] 🔔 Device marked as awake');

    // Auto-sleep after 10 seconds of inactivity
    clearTimeout(this._sleepTimer);
    this._sleepTimer = setTimeout(() => {
      this._isDeviceAwake = false;
      this.log('[SLEEPY] 💤 Device assumed sleeping (timeout)');
    }, 10000);
  }

  /**
   * v5.5.299: Smart ZCL read with sleepy device optimization
   * Only attempts ZCL reads when device is likely awake
   */
  async _smartZclRead(cluster, attributes, timeout = null) {
    timeout = timeout || this.zclTimeout;

    if (!this._isDeviceAwake && Date.now() - this._lastWakeTime > 30000) {
      this.log(`[SLEEPY] ⏭️ Skipping ZCL read - device sleeping (${attributes.join(', ')})`);
      return null;
    }

    try {
      const readId = `${cluster.name || cluster.constructor.name}_${attributes.join('_')}`;

      if (this._pendingZclReads.has(readId)) {
        this.log(`[SLEEPY] ⏯️ ZCL read already pending: ${readId}`);
        return null;
      }

      this._pendingZclReads.add(readId);
      this.log(`[SLEEPY] 🔄 Smart ZCL read: ${readId} (timeout: ${timeout}ms)`);

      const data = await Promise.race([
        cluster.readAttributes(attributes),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Smart timeout')), timeout))
      ]);

      this._pendingZclReads.delete(readId);
      this.log(`[SLEEPY] ✅ ZCL read success: ${readId}`);
      return data;
    } catch (err) {
      this._pendingZclReads.delete(readId);
      this.log(`[SLEEPY] ⚠️ ZCL read failed: ${err.message}`);
      return null;
    }
  }

  /**
   * v5.5.111: Read battery while device is awake (after motion detection)
   * v5.5.299: Enhanced with smart ZCL communication
   */
  async _readBatteryWhileAwake(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = ep1.clusters || {};

    // Find power configuration cluster
    const powerCluster =
      clusters.powerConfiguration ||
      clusters.genPowerCfg ||
      clusters[0x0001] ||
      clusters['0x0001'] ||
      clusters['1'];

    if (!powerCluster?.readAttributes) {
      this.log('[MOTION-BATTERY] No powerConfiguration cluster');
      return;
    }

    try {
      this.log('[MOTION-BATTERY] 🔋 Smart battery read while device is awake...');
      const data = await this._smartZclRead(powerCluster, ['batteryPercentageRemaining', 'batteryVoltage'], 3000);

      // v5.5.366: Throttle battery reports to prevent spam
      const now = Date.now();
      const lastBatteryReport = this._lastBatteryReportTime || 0;
      const throttleMs = MotionSensorDevice.BATTERY_THROTTLE_MS;

      if (now - lastBatteryReport < throttleMs) {
        this.log('[MOTION-BATTERY] ⏱️ Battery report throttled (spam prevention)');
        return;
      }

      if (data?.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== 255) {
        this._lastBatteryReportTime = now;
        const battery = Math.round(data.batteryPercentageRemaining / 2);
        this.log(`[MOTION-BATTERY] 🔋 Battery: ${battery}% (raw: ${data.batteryPercentageRemaining})`);
        if (this.hasCapability('measure_battery')) {
          await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
        }
      } else if (data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
        this._lastBatteryReportTime = now;
        // Fallback: estimate from voltage (typical CR2450: 3.0V = 100%, 2.0V = 0%)
        const voltage = data.batteryVoltage / 10;
        const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
        this.log(`[MOTION-BATTERY] 🔋 Battery from voltage: ${voltage}V → ${battery}%`);
        if (this.hasCapability('measure_battery')) {
          await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
        }
      } else {
        this.log('[MOTION-BATTERY] Battery data invalid:', data);
      }
    } catch (e) {
      this.log('[MOTION-BATTERY] Battery read failed (device may have gone to sleep):', e.message);
    }
  }

  /**
   * v5.5.806: Configure attribute reporting (once per session)
   * This tells the device to send updates automatically
   * v5.5.806: FORUM FIX - Added illuminance reporting for continuous lux updates
   */
  async _configureReportingOnce(endpoint) {
    if (this._reportingConfigured) return;
    this._reportingConfigured = true;

    this.log('[MOTION-REPORTING] Configuring attribute reporting for temp/humidity/illuminance...');

    // Configure temperature reporting
    const tempCluster = endpoint.clusters?.temperatureMeasurement;
    if (tempCluster?.configureReporting) {
      try {
        await tempCluster.configureReporting({
          measuredValue: {
            minInterval: 60,      // Min 1 minute between reports
            maxInterval: 3600,    // Max 1 hour
            minChange: 50         // Report if change >= 0.5°C
          }
        });
        this.log('[MOTION-REPORTING] ✅ Temperature reporting configured');
      } catch (e) {
        this.log('[MOTION-REPORTING] Temperature reporting failed (device may not support)');
      }
    }

    // Configure humidity reporting
    const humCluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.relativeHumidityMeasurement;
    if (humCluster?.configureReporting) {
      try {
        await humCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100        // Report if change >= 1%
          }
        });
        this.log('[MOTION-REPORTING] ✅ Humidity reporting configured');
      } catch (e) {
        this.log('[MOTION-REPORTING] Humidity reporting failed (device may not support)');
      }
    }

    // v5.5.806: FORUM FIX - Configure illuminance reporting for CONTINUOUS lux updates
    // Forum issue: Luminance only updates on motion, should update independently
    const illuminanceCluster = endpoint.clusters?.illuminanceMeasurement 
      || endpoint.clusters?.msIlluminanceMeasurement
      || endpoint.clusters?.[0x0400];
    if (illuminanceCluster?.configureReporting) {
      try {
        await illuminanceCluster.configureReporting({
          measuredValue: {
            minInterval: 30,       // Min 30 seconds between reports
            maxInterval: 300,      // Max 5 minutes - ensures continuous updates
            minChange: 50          // Report if change >= 50 lux
          }
        });
        this.log('[MOTION-REPORTING] ✅ Illuminance reporting configured (30s-5min, 50lux change)');
      } catch (e) {
        this.log('[MOTION-REPORTING] Illuminance reporting failed:', e.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.317: INTELLIGENT LUX-BASED MOTION INFERENCE
  // Infers motion from rapid lux changes when PIR sensor fails or is unreliable
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle lux updates for motion inference
   * When PIR is unreliable, use lux changes to infer motion
   */
  _handleLuxForMotionInference(lux) {
    if (!this._motionLuxInference) return;

    // Feed lux to inference engine
    const inferredMotion = this._motionLuxInference.updateLux(lux);

    // Only use inference if PIR has been unreliable
    if (!this._useMotionInference) return;

    if (inferredMotion !== null && inferredMotion !== this._lastInferredMotion) {
      this._lastInferredMotion = inferredMotion;

      const confidence = this._motionLuxInference.getConfidence();
      this.log(`[MOTION-INFER] 🔦 Lux-inferred motion: ${inferredMotion} (confidence: ${confidence}%)`);

      // Only update if confidence is high enough
      if (confidence >= 50) {
        this.setCapabilityValue('alarm_motion', inferredMotion).catch(() => { });

        // Trigger flow if motion detected
        if (inferredMotion && this.driver?.motionTrigger) {
          this.driver.motionTrigger.trigger(this, { source: 'lux_inference' }, {}).catch(() => { });
        }
      }
    }
  }

  /**
   * Track PIR reliability and enable inference if needed
   * Called when PIR reports contradictory or stuck values
   */
  _trackPirReliability(pirValue) {
    // Calibrate inference with actual PIR value
    this._motionLuxInference?.updateDirectMotion(pirValue);

    // Track if PIR seems stuck (same value for too long with lux changes)
    if (this._lastPirValue === pirValue) {
      const luxHasActivity = this._motionLuxInference?.hasRecentActivity('lux', 60000);

      if (luxHasActivity) {
        this._pirFailCount++;

        if (this._pirFailCount >= 5 && !this._useMotionInference) {
          this._useMotionInference = true;
          this.log('[MOTION-INFER] ⚠️ PIR appears stuck - enabling lux-based motion inference');
        }
      }
    } else {
      // PIR is working, reduce fail count
      this._pirFailCount = Math.max(0, this._pirFailCount - 1);

      if (this._pirFailCount === 0 && this._useMotionInference) {
        this._useMotionInference = false;
        this.log('[MOTION-INFER] ✅ PIR working again - disabling lux-based inference');
      }
    }

    this._lastPirValue = pirValue;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.355: SMART LUX REPORTING SYSTEM
  // Independent luminance reporting not tied to motion events
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start smart lux reporting timer for frequent luminance updates
   */
  _startSmartLuxReporting() {
    if (!this._luxSmartReporting?.enabled) return;

    // Clear any existing timer
    if (this._luxReportTimer) {
      clearInterval(this._luxReportTimer);
    }

    this._luxReportTimer = setInterval(() => {
      this._requestLuxUpdate();
    }, this._luxSmartReporting.luxReportInterval);

    this.log('[LUX-SMART] 🌟 Smart luminance reporting started (5min intervals)');
  }

  /**
   * Request luminance update from device
   */
  async _requestLuxUpdate() {
    if (!this._luxSmartReporting?.enabled) return;

    try {
      // Try Tuya DP first (more reliable for sleepy devices)
      const luxDPs = [3, 9, 12, 102, 106];
      let luxValue = null;

      // Check if we have recent lux data from DPs
      for (const dp of luxDPs) {
        if (this._dpCache && this._dpCache[dp]) {
          luxValue = this._dpCache[dp].value;
          break;
        }
      }

      // If no DP data, try ZCL (only if device appears awake)
      if (luxValue === null && this._isDeviceAwake) {
        try {
          const illuminanceCluster = this.zclNode?.endpoints?.[1]?.clusters?.illuminanceMeasurement;
          if (illuminanceCluster) {
            const data = await illuminanceCluster.readAttributes(['measuredValue']);
            if (data.measuredValue !== undefined) {
              luxValue = Math.round(Math.pow(10, (data.measuredValue - 1) / 10000));
            }
          }
        } catch (err) {
          this.log('[LUX-SMART] ZCL read failed (device sleeping?):', err.message);
        }
      }

      // Process lux value if obtained
      if (luxValue !== null) {
        this._processSmartLuxUpdate(luxValue);
      }

    } catch (err) {
      this.log('[LUX-SMART] ⚠️ Error requesting lux update:', err.message);
    }
  }

  /**
   * Process smart lux update with intelligent reporting logic
   */
  _processSmartLuxUpdate(luxValue) {
    const now = Date.now();
    const config = this._luxSmartReporting;

    // Validate lux value
    if (luxValue < 0 || luxValue > 100000) {
      this.log(`[LUX-SMART] ⚠️ Invalid lux value: ${luxValue}`);
      return;
    }

    const lastLux = config.lastLuxValue;
    const timeSinceLastReport = now - config.lastLuxTime;

    let shouldReport = false;
    let reason = '';

    // First reading ever
    if (lastLux === null) {
      shouldReport = true;
      reason = 'initial';
    }
    // Force report after long interval
    else if (timeSinceLastReport >= config.forceReportInterval) {
      shouldReport = true;
      reason = 'force-interval';
    }
    // Significant change detected
    else if (lastLux > 0) {
      const changePercent = Math.abs((luxValue - lastLux) / lastLux) * 100;
      if (changePercent >= config.luxChangeThreshold) {
        shouldReport = true;
        reason = `change-${changePercent.toFixed(1)}%`;
      }
    }
    // Handle transition from/to zero
    else if ((lastLux === 0 && luxValue > 0) || (lastLux > 0 && luxValue === 0)) {
      shouldReport = true;
      reason = 'zero-transition';
    }

    if (shouldReport) {
      this.log(`[LUX-SMART] 💡 Smart lux update: ${luxValue} lux (${reason})`);
      this.setCapabilityValue('measure_luminance', parseFloat(luxValue)).catch(() => { });

      config.lastLuxValue = luxValue;
      config.lastLuxTime = now;

      // Feed to motion inference as well
      this._handleLuxForMotionInference(luxValue);

      // Trigger lux-specific flow if available
      if (this.driver?.luxChangedTrigger) {
        this.driver.luxChangedTrigger.trigger(this, {
          lux: luxValue,
          source: 'smart_reporting'
        }, {}).catch(() => { });
      }
    }
  }

  /**
   * Enhanced lux handling - also feeds smart reporting system
   */
  _enhancedLuxUpdate(luxValue, source = 'unknown') {
    // Update smart reporting cache
    if (this._luxSmartReporting) {
      this._processSmartLuxUpdate(luxValue);
    }

    // Original lux inference logic
    this._handleLuxForMotionInference(luxValue);
  }

  /**
   * Cleanup timers on device destroy
   */
  /**
   * v5.5.793: Enhanced cleanup on device destroy
   */
  async onDeleted() {
    // v5.5.930: Clear DP polling interval
    if (this._dpPollingInterval) {
      clearInterval(this._dpPollingInterval);
      this._dpPollingInterval = null;
    }
    // Clear lux reporting timer
    if (this._luxReportTimer) {
      clearInterval(this._luxReportTimer);
      this._luxReportTimer = null;
    }
    // Clear sleep timer
    if (this._sleepTimer) {
      clearTimeout(this._sleepTimer);
      this._sleepTimer = null;
    }
    // v5.8.32: Clear permissive cleanup timer
    if (this._permissiveCleanupTimeout) {
      this.homey.clearTimeout(this._permissiveCleanupTimeout);
      this._permissiveCleanupTimeout = null;
    }
    // Clear pending ZCL reads
    if (this._pendingZclReads) {
      this._pendingZclReads.clear();
    }
    await super.onDeleted?.();
  }

  /**
   * v5.5.793: Cleanup on uninit
   */
  async onUninit() {
    this.log('[MOTION] onUninit - cleaning up...');
    // v5.5.930: Clear DP polling interval
    if (this._dpPollingInterval) {
      clearInterval(this._dpPollingInterval);
      this._dpPollingInterval = null;
    }
    if (this._luxReportTimer) {
      clearInterval(this._luxReportTimer);
      this._luxReportTimer = null;
    }
    if (this._sleepTimer) {
      clearTimeout(this._sleepTimer);
      this._sleepTimer = null;
    }
    if (super.onUninit) {
      await super.onUninit();
    }
    this.log('[MOTION] ✅ Cleanup complete');
  }

}

module.exports = MotionSensorDevice;
