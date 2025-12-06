'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Climate Sensor Device - v5.5.26 ENHANCED
 *
 * Sources:
 * - Z2M: Temperature & humidity sensor with clock (TH05Z)
 * - ZHA: Quirk for _TZE284_vvmbj46n with time sync
 * - Homey Community: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test
 *
 * Uses HybridSensorBase for:
 * - Anti-double init
 * - MaxListeners bump
 * - Protocol auto-detection
 * - Phantom sub-device rejection
 * - Automatic ZCL/Tuya DP handling via onTuyaStatus()
 *
 * Supports: Temperature, Humidity, Battery, Time Sync
 *
 * KNOWN MODELS:
 * - TS0601 / _TZE200_* : Standard Tuya climate sensors (DP1/2/4)
 * - TS0601 / _TZE204_* : Newer Tuya climate sensors (DP1/2/4)
 * - TS0601 / _TZE284_vvmbj46n : TH05Z LCD climate monitor (DP1/2/4 + config DP9-20)
 * - TS0601 / _TZE200_vvmbj46n : ONENUO TH05Z (same as above)
 * - TS0201 / _TZ3000_* : ZCL-based sensors (handled via ZCL mode)
 *
 * ⚠️  IMPORTANT: DP3/5/15 are for SOIL SENSORS, NOT climate sensors!
 * Climate sensors use: DP1=temp, DP2=humidity, DP4=battery (x2 multiplier)
 *
 * v5.5.26: Enhanced time sync (every 6h) for clock devices
 */
class ClimateSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Capabilities for climate sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * v5.4.8: CORRECTED DP MAPPINGS - Fixed soil sensor vs climate sensor confusion
   * Sources:
   * - https://github.com/Koenkk/zigbee2mqtt/issues/26078 (_TZE284_vvmbj46n TH05Z)
   * - https://raw.githubusercontent.com/kkossev/Hubitat/main/Drivers/Tuya Temperature Humidity Illuminance LCD Display with a Clock/Tuya_Temperature_Humidity_Illuminance_LCD_Display_with_a_Clock.groovy
   *
   * CRITICAL: DP3, DP5, DP15 are for SOIL SENSORS, NOT climate sensors!
   * _TZE284_vvmbj46n (TH05Z LCD) uses: DP1=temp, DP2=humidity, DP4=battery
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE - Standard DP1 (all climate sensors) + alternative DP18
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'measure_temperature', divisor: 10 },    // Standard: value/10 = °C
      18: { capability: 'measure_temperature', divisor: 10 },   // Alternative temp DP (some models)

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY - Standard DP2 (all climate sensors)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_humidity', divisor: 1 },        // Standard: direct %

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - Standard DP4 (most climate sensors with x2 multiplier)
      // v5.3.99: ZHA quirk shows DP4 has x*2 multiplier (device reports half)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },

      // ═══════════════════════════════════════════════════════════════════
      // v5.4.8: _TZE284_vvmbj46n TH05Z LCD CONFIGURATION DPs
      // These DPs are for device configuration/settings - not capabilities
      // Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'temperature_unit' },     // 0=Celsius, 1=Fahrenheit
      10: { capability: null, setting: 'max_temp_alarm', divisor: 10 },  // Max temp threshold (°C/10)
      11: { capability: null, setting: 'min_temp_alarm', divisor: 10 },  // Min temp threshold (°C/10)
      12: { capability: null, setting: 'max_humidity_alarm' },  // Max humidity threshold (%)
      13: { capability: null, setting: 'min_humidity_alarm' },  // Min humidity threshold (%)
      // v5.4.8: DP14/DP15 are alarm STATUS (enum: cancel/lower/upper), NOT alarm_generic
      14: { capability: null }, // Temp alarm status (no valid Homey capability)
      15: { capability: null }, // Humidity alarm status (no valid Homey capability - NOT battery!)
      17: { capability: null, setting: 'temp_report_interval' },  // Minutes (1-120)
      18: { capability: null, setting: 'humidity_report_interval' }, // Minutes (1-120) - was missing in early Z2M
      19: { capability: null, setting: 'temp_sensitivity', divisor: 10 },  // °C sensitivity (0.3-1.0)
      20: { capability: null, setting: 'humidity_sensitivity' }, // % sensitivity (3-10)

      // ═══════════════════════════════════════════════════════════════════
      // BUTTON PRESS (common for devices with buttons)
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: 'button', transform: () => true },     // Button press
      102: { capability: 'button', transform: () => true },     // Alternative button

      // ═══════════════════════════════════════════════════════════════════
      // ADDITIONAL DPs (fallbacks for other climate sensor variants)
      // ═══════════════════════════════════════════════════════════════════
      6: { capability: 'measure_temperature', divisor: 10 },    // Some _TZE204 models
      7: { capability: 'measure_humidity', divisor: 1 },        // Some _TZE204 models
      103: { capability: 'measure_humidity', divisor: 1 },      // Some alternative models
    };
  }

  async onNodeInit({ zclNode }) {
    // Call base class - handles everything!
    await super.onNodeInit({ zclNode });

    // Log sensor-specific info with model details
    const settings = this.getSettings() || {};
    const modelId = settings.zb_modelId || 'unknown';
    const mfr = settings.zb_manufacturerName || 'unknown';

    this.log('[CLIMATE] ════════════════════════════════════════════════════');
    this.log(`[CLIMATE] ✅ Climate sensor ready`);
    this.log(`[CLIMATE] Model: ${modelId}`);
    this.log(`[CLIMATE] Manufacturer: ${mfr}`);
    this.log('[CLIMATE] ════════════════════════════════════════════════════');

    // v5.4.7: Initialize time sync for _TZE284_vvmbj46n
    if (mfr && mfr.includes('_TZE284_')) {
      this.log('[CLIMATE] 🕒 _TZE284 device detected - initializing time sync...');
      await this._setupTimeSync().catch(err => {
        this.error('[CLIMATE] Time sync setup failed (non-critical):', err.message);
      });
    }

    // For debugging: log when we receive ANY DP
    this.log('[CLIMATE] 👀 Watching for temperature/humidity data...');
    this.log('[CLIMATE] ℹ️ Battery-powered sensors may take minutes to hours to report');
  }

  /**
   * v5.4.7: Setup time synchronization for _TZE284_vvmbj46n climate monitor
   * Syncs device clock with Homey using Zigbee Time cluster (0x000A)
   */
  async _setupTimeSync() {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[CLIMATE] ⚠️ No endpoint 1 available for time sync');
        return;
      }

      // Check if time cluster is available
      const timeCluster = endpoint.clusters?.time || endpoint.clusters?.[0x000A];
      if (!timeCluster) {
        this.log('[CLIMATE] ℹ️ Time cluster not available on this device');
        return;
      }

      // Sync time now
      await this._syncDeviceTime(timeCluster);

      // v5.5.26: Schedule time sync every 6 hours (improved from 24h)
      // More frequent sync ensures clock stays accurate on LCD devices
      this._timeSyncInterval = setInterval(() => {
        this._syncDeviceTime(timeCluster).catch(err => {
          this.error('[CLIMATE] Time sync failed:', err.message);
        });
      }, 6 * 60 * 60 * 1000); // 6 hours

      this.log('[CLIMATE] ✅ Time sync enabled (every 6 hours)');
    } catch (err) {
      this.error('[CLIMATE] Time sync setup error:', err.message);
    }
  }

  /**
   * v5.4.7: Sync device time with Homey
   * Zigbee time = seconds since 2000-01-01 00:00:00 UTC
   */
  async _syncDeviceTime(timeCluster) {
    try {
      const now = new Date();
      const epochStart = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
      const secondsSince2000 = Math.floor((now.getTime() - epochStart.getTime()) / 1000);

      // Get timezone offset in seconds (for localTime attribute)
      const timezoneOffsetSeconds = -now.getTimezoneOffset() * 60;

      this.log('[CLIMATE] 🕒 Syncing device time...');
      this.log(`[CLIMATE]    UTC time: ${secondsSince2000}s since 2000`);
      this.log(`[CLIMATE]    Timezone: ${timezoneOffsetSeconds / 3600}h offset`);

      await timeCluster.writeAttributes({
        time: secondsSince2000,
        localTime: secondsSince2000 + timezoneOffsetSeconds,
        timeZone: timezoneOffsetSeconds,
      });

      this.log('[CLIMATE] ✅ Device time synchronized');
    } catch (err) {
      // Non-critical error - device might be sleeping
      this.log('[CLIMATE] ⚠️ Time sync failed (device may be sleeping):', err.message);
    }
  }

  /**
   * v5.5.27: Refresh all DPs + time sync - called by Flow Card or manual refresh
   */
  async refreshAll() {
    this.log('[CLIMATE-REFRESH] Refreshing all DPs + time sync...');

    // DPs based on DP mappings for climate sensors
    const DPS_TEMP = [1, 18];            // Temperature
    const DPS_HUM = [2];                 // Humidity
    const DPS_BATTERY = [4, 15];         // Battery
    const DPS_CONFIG = [9, 17, 19, 20];  // Config settings

    const allDPs = [...DPS_TEMP, ...DPS_HUM, ...DPS_BATTERY];

    // Query DPs
    await this.safeTuyaDataQuery(allDPs, {
      logPrefix: '[CLIMATE-REFRESH]',
      delayBetweenQueries: 150,
    });

    // Also sync time while device is awake
    const endpoint = this.zclNode?.endpoints?.[1];
    const timeCluster = endpoint?.clusters?.time || endpoint?.clusters?.[0x000A];
    if (timeCluster) {
      await this._syncDeviceTime(timeCluster).catch(() => { });
    }

    return true;
  }

  async onDeleted() {
    // v5.4.7: Clear time sync interval
    if (this._timeSyncInterval) {
      clearInterval(this._timeSyncInterval);
      this._timeSyncInterval = null;
    }

    await super.onDeleted();
  }

  /**
   * v5.5.5: Enhanced logging per MASTER BLOCK specs
   * Shows raw + converted values for each DP
   */
  onTuyaStatus(status) {
    if (!status) {
      super.onTuyaStatus(status);
      return;
    }

    const dp = status.dp;
    const rawValue = status.data || status.value;

    // v5.5.5: Log raw + converted per MASTER BLOCK format
    switch (dp) {
      case 1: // Temperature (standard)
      case 5: // Temperature (TZE284 soil variant)
      case 18: // Temperature (alt)
        this.log(`[ZCL-DATA] TS0601_climate.temperature raw=${rawValue} converted=${rawValue / 10}`);
        break;
      case 2: // Humidity (standard)
      case 3: // Humidity (TZE284 soil variant)
        this.log(`[ZCL-DATA] TS0601_climate.humidity raw=${rawValue} converted=${rawValue}`);
        break;
      case 4: // Battery (standard with x2 multiplier)
        this.log(`[ZCL-DATA] TS0601_climate.battery raw=${rawValue} converted=${Math.min(rawValue * 2, 100)}`);
        break;
      case 15: // Battery (TZE284 variant - no multiplier)
        this.log(`[ZCL-DATA] TS0601_climate.battery raw=${rawValue} converted=${rawValue}`);
        break;
      default:
        if (dp !== undefined) {
          this.log(`[ZCL-DATA] TS0601_climate.unknown_dp dp=${dp} raw=${rawValue}`);
        }
    }

    // Call parent handler
    super.onTuyaStatus(status);

    // Log final capability values
    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      this.log(`[ZCL-DATA] TS0601_climate CAPABILITIES temp=${temp}°C humidity=${hum}% battery=${bat}%`);
    }, 100);
  }
}

module.exports = ClimateSensorDevice;
