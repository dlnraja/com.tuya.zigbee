'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Climate Sensor Device - v5.3.85 PHANTOM FIX
 *
 * Uses HybridSensorBase for:
 * - Anti-double init
 * - MaxListeners bump
 * - Protocol auto-detection
 * - Phantom sub-device rejection
 * - Automatic ZCL/Tuya DP handling via onTuyaStatus()
 *
 * Supports: Temperature, Humidity, Battery
 *
 * KNOWN MODELS:
 * - TS0601 / _TZE200_* : Standard Tuya climate sensors
 * - TS0601 / _TZE204_* : Newer Tuya climate sensors
 * - TS0601 / _TZE284_* : v2.84 protocol climate sensors (e.g. _TZE284_vvmbj46n)
 * - TS0201 / _TZ3000_* : ZCL-based sensors (handled via ZCL mode)
 */
class ClimateSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Capabilities for climate sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * v5.3.97: UPDATED FROM ZIGBEE2MQTT - Complete DP mappings
   * Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
   *
   * Covers: _TZE284_vvmbj46n, _TZE200_*, _TZE204_* climate sensors
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE (most common DPs) - From Z2M _TZE284_vvmbj46n
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'measure_temperature', divisor: 10 },    // Standard: value/10 = °C
      5: { capability: 'measure_temperature', divisor: 10 },    // v5.4.7: _TZE284_vvmbj46n uses DP5
      18: { capability: 'measure_temperature', divisor: 10 },   // Alternative temp DP

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY - Standard (DP2) + _TZE284_vvmbj46n (DP3)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_humidity', divisor: 1 },        // Standard: direct %
      3: { capability: 'measure_humidity', divisor: 1 },        // v5.4.7: _TZE284_vvmbj46n uses DP3

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - Standard (DP4) + _TZE284_vvmbj46n (DP15)
      // v5.3.99: ZHA quirk shows DP4 has x*2 multiplier (device reports half)
      // v5.4.7: DP15 (_TZE284_vvmbj46n) uses direct percentage
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },
      15: { capability: 'measure_battery', divisor: 1 },        // v5.4.7: _TZE284_vvmbj46n direct %

      // ═══════════════════════════════════════════════════════════════════
      // v5.3.97: _TZE284_vvmbj46n SPECIFIC DPs (from Z2M)
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'temperature_unit' },     // 0=C, 1=F
      10: { capability: null, setting: 'max_temp_alarm', divisor: 10 },
      11: { capability: null, setting: 'min_temp_alarm', divisor: 10 },
      12: { capability: null, setting: 'max_humidity_alarm' },
      13: { capability: null, setting: 'min_humidity_alarm' },
      // v5.4.7: REMOVED alarm_generic - NOT a valid Homey capability
      // DP 14 & 15 are alarm states but Homey doesn't have alarm_generic
      14: { capability: null }, // Temp alarm state (no valid capability)
      15: { capability: null }, // Humidity alarm (no valid capability)
      17: { capability: null, setting: 'temp_report_interval' },  // Minutes
      19: { capability: null, setting: 'temp_sensitivity', divisor: 10 },
      20: { capability: null, setting: 'humidity_sensitivity' },

      // ═══════════════════════════════════════════════════════════════════
      // BUTTON PRESS (common for devices with buttons)
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: 'button', transform: () => true },     // Button press
      102: { capability: 'button', transform: () => true },     // Alternative button

      // ═══════════════════════════════════════════════════════════════════
      // ADDITIONAL DPs (fallbacks)
      // ═══════════════════════════════════════════════════════════════════
      6: { capability: 'measure_temperature', divisor: 10 },    // Some _TZE204 models
      7: { capability: 'measure_humidity', divisor: 1 },        // Some _TZE204 models
      103: { capability: 'measure_humidity', divisor: 1 },      // _TZE284 humidity (some)
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

      // Schedule daily time sync
      this._timeSyncInterval = setInterval(() => {
        this._syncDeviceTime(timeCluster).catch(err => {
          this.error('[CLIMATE] Daily time sync failed:', err.message);
        });
      }, 24 * 60 * 60 * 1000); // 24 hours

      this.log('[CLIMATE] ✅ Time sync enabled (daily updates)');
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

  async onDeleted() {
    // v5.4.7: Clear time sync interval
    if (this._timeSyncInterval) {
      clearInterval(this._timeSyncInterval);
      this._timeSyncInterval = null;
    }

    await super.onDeleted();
  }

  /**
   * v5.3.82: Override onTuyaStatus for additional climate-specific logging
   */
  onTuyaStatus(status) {
    this.log('[CLIMATE] ╔════════════════════════════════════════════════════════╗');
    this.log('[CLIMATE] ║ 📥 TUYA DATA RECEIVED!                                 ║');
    this.log('[CLIMATE] ╚════════════════════════════════════════════════════════╝');
    this.log('[CLIMATE] Raw status:', JSON.stringify(status));

    // Call parent handler (now properly defined in HybridSensorBase!)
    super.onTuyaStatus(status);

    // Log current capability values after processing
    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      this.log('[CLIMATE] ╔════════════════════════════════════════════════════════╗');
      this.log(`[CLIMATE] ║ 📊 Temperature: ${temp !== null ? temp + '°C' : 'waiting...'}`);
      this.log(`[CLIMATE] ║ 💧 Humidity:    ${hum !== null ? hum + '%' : 'waiting...'}`);
      this.log(`[CLIMATE] ║ 🔋 Battery:     ${bat !== null ? bat + '%' : 'waiting...'}`);
      this.log('[CLIMATE] ╚════════════════════════════════════════════════════════╝');
    }, 100);
  }
}

module.exports = ClimateSensorDevice;
