'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Climate Sensor Device - v5.3.70 COMPLETE TUYA DP FIX
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
   * DP mappings for Tuya EF00 climate sensors
   * Comprehensive list covering multiple manufacturer variants
   *
   * Sources: Z2M, ZHA, Tuya IoT documentation
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE (most common DPs)
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'measure_temperature', divisor: 10 },    // Standard: value/10 = °C
      18: { capability: 'measure_temperature', divisor: 10 },   // Alternative temp DP

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY (most common DPs)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_humidity', divisor: 1 },        // Standard: direct %
      19: { capability: 'measure_humidity', divisor: 1 },       // Alternative humidity DP

      // ═══════════════════════════════════════════════════════════════════
      // SOIL SENSORS (some climate sensors are actually soil sensors)
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_temperature', divisor: 10 },    // Soil temperature
      5: { capability: 'measure_humidity', divisor: 1 },        // Soil moisture %

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (multiple DPs used by different manufacturers)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },         // Battery % (0-100)
      15: { capability: 'measure_battery', divisor: 1 },        // Alternative battery
      101: { capability: 'measure_battery', divisor: 1 },       // _TZE284 battery
      14: { capability: 'alarm_battery', transform: (v) => v === 1 }, // Low battery alarm

      // ═══════════════════════════════════════════════════════════════════
      // ADDITIONAL DPs (less common but documented)
      // ═══════════════════════════════════════════════════════════════════
      6: { capability: 'measure_temperature', divisor: 10 },    // Some _TZE204 models
      7: { capability: 'measure_humidity', divisor: 1 },        // Some _TZE204 models
      9: { capability: 'measure_temperature', divisor: 10 },    // Rare variants
      10: { capability: 'measure_humidity', divisor: 1 },       // Rare variants
      102: { capability: 'measure_temperature', divisor: 10 },  // _TZE284 temp (some)
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
