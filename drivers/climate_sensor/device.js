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
      18: { capability: 'measure_temperature', divisor: 10 },   // Alternative temp DP

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY (most common DPs)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_humidity', divisor: 1 },        // Standard: direct %

      // ═══════════════════════════════════════════════════════════════════
      // SOIL SENSORS (some climate sensors are actually soil sensors)
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_temperature', divisor: 10 },    // Soil temperature
      5: { capability: 'measure_humidity', divisor: 1 },        // Soil moisture %

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (multiple DPs used by different manufacturers)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },         // Battery % (0-100)

      // ═══════════════════════════════════════════════════════════════════
      // v5.3.97: _TZE284_vvmbj46n SPECIFIC DPs (from Z2M)
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'temperature_unit' },     // 0=C, 1=F
      10: { capability: null, setting: 'max_temp_alarm', divisor: 10 },
      11: { capability: null, setting: 'min_temp_alarm', divisor: 10 },
      12: { capability: null, setting: 'max_humidity_alarm' },
      13: { capability: null, setting: 'min_humidity_alarm' },
      14: { capability: 'alarm_generic', transform: (v) => v === 0 || v === 1 }, // Temp alarm state
      15: { capability: 'alarm_generic.humidity', transform: (v) => v === 0 || v === 1 }, // Humidity alarm
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

    // For debugging: log when we receive ANY DP
    this.log('[CLIMATE] 👀 Watching for temperature/humidity data...');
    this.log('[CLIMATE] ℹ️ Battery-powered sensors may take minutes to hours to report');
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
