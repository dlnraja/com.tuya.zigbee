'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Soil Sensor Device - v5.4.3 NEW
 *
 * Uses HybridSensorBase for:
 * - Anti-double init
 * - MaxListeners bump
 * - Protocol auto-detection
 * - Phantom sub-device rejection
 * - Automatic ZCL/Tuya DP handling via onTuyaStatus()
 *
 * Supports: Temperature, Humidity, Soil Moisture, Battery
 *
 * KNOWN MODELS:
 * - TS0601 / _TZE284_oitavov2 : Tuya soil moisture sensor
 *
 * Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/
 */
class SoilSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Capabilities for soil sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * v5.5.25: CORRECTED DP mappings for Soil Sensors (_TZE284_oitavov2)
   *
   * Source: ZHA quirk + Z2M + Community research
   * https://switt.kongdachalert.com/zha-code-for-tuya-moisture-sensor-stick-2/
   * https://community.home-assistant.io/t/ts0601-by-tze284-oitavov2-soil/899999
   *
   * CRITICAL FIX: _TZE284_oitavov2 (QT-07S) uses:
   * - DP2: temperature_unit (0=C, 1=F)
   * - DP3: soil_moisture % (NOT temperature!)
   * - DP5: temperature ÷10 (or ÷100 for some devices)
   * - DP14: battery_state enum (0=low, 1=medium, 2=high)
   * - DP15: battery_percent %
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SOIL MOISTURE - DP3 (main sensor value)
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_humidity', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE - DP5 (soil temperature)
      // Some devices report ×10, others ×100 - auto-detect
      // ═══════════════════════════════════════════════════════════════════
      5: {
        capability: 'measure_temperature',
        transform: (v) => {
          // Auto-detect scale: if value > 1000, it's ÷100, else ÷10
          if (v > 1000) return v / 100;
          if (v > 100) return v / 10;
          return v / 10; // Default ÷10
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - DP15 (percentage) + DP14 (state enum)
      // ═══════════════════════════════════════════════════════════════════
      15: { capability: 'measure_battery', divisor: 1 },
      14: {
        capability: 'measure_battery',
        transform: (v) => {
          // battery_state enum: 0=low(10%), 1=medium(50%), 2=high(100%)
          if (v === 0) return 10;
          if (v === 1) return 50;
          if (v === 2) return 100;
          return v;
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // SETTINGS - temperature unit
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: null, setting: 'temperature_unit' }, // 0=C, 1=F

      // ═══════════════════════════════════════════════════════════════════
      // FALLBACK DPs for other soil sensor variants
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'measure_temperature', divisor: 10 },  // Some variants
      4: { capability: 'measure_battery', divisor: 1 },       // Alternative battery DP
      101: { capability: 'measure_humidity', divisor: 1 },    // Alternative moisture
      105: { capability: 'measure_humidity', divisor: 1, transform: (v) => v > 100 ? v / 10 : v },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    const settings = this.getSettings() || {};
    const modelId = settings.zb_modelId || 'unknown';
    const mfr = settings.zb_manufacturerName || 'unknown';

    this.log('[SOIL] ========================================================');
    this.log('[SOIL] Soil sensor ready');
    this.log('[SOIL] Model:', modelId);
    this.log('[SOIL] Manufacturer:', mfr);
    this.log('[SOIL] ========================================================');
    this.log('[SOIL] Watching for temperature/humidity/soil_moisture data...');

    // v5.5.19: Battery devices need periodic DP requests
    // Request DPs immediately and then every 30 minutes
    await this._requestSoilDPs();
    this._startPeriodicDPRequest();
  }

  /**
   * v5.5.19: Request soil-specific DPs
   */
  async _requestSoilDPs() {
    if (!this.tuyaEF00Manager) {
      this.log('[SOIL] ⚠️ No Tuya manager - waiting for device to wake up');
      return;
    }

    try {
      // Request all soil sensor DPs: 1,2,3,4,5,15,101,105
      const dps = [1, 2, 3, 4, 5, 15, 101, 105];
      this.log(`[SOIL] Requesting DPs: ${dps.join(', ')}`);

      if (typeof this.tuyaEF00Manager.requestDPs === 'function') {
        await this.tuyaEF00Manager.requestDPs(dps);
        this.log('[SOIL] DP request sent');
      } else if (typeof this.tuyaEF00Manager.sendCommand === 'function') {
        // Alternative: send a generic query command
        await this.tuyaEF00Manager.sendCommand({ command: 0x00 });
      }
    } catch (err) {
      this.log('[SOIL] ⚠️ DP request failed (device may be sleeping):', err.message);
    }
  }

  /**
   * v5.5.19: Start periodic DP requests for battery devices
   */
  _startPeriodicDPRequest() {
    // Clear existing interval if any
    if (this._dpRequestInterval) {
      clearInterval(this._dpRequestInterval);
    }

    // Request DPs every 30 minutes (battery devices wake up periodically)
    const intervalMs = 30 * 60 * 1000; // 30 minutes
    this._dpRequestInterval = setInterval(() => {
      this._requestSoilDPs();
    }, intervalMs);

    this.log('[SOIL] Periodic DP request started (every 30 min)');
  }

  /**
   * v5.5.19: Clean up on device destroy
   */
  onDeleted() {
    if (this._dpRequestInterval) {
      clearInterval(this._dpRequestInterval);
    }
    if (super.onDeleted) super.onDeleted();
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
      case 3: // Temperature (soil sensors use DP3)
      case 5: // Temperature alternate
        this.log(`[ZCL-DATA] TS0601_oitavov2.temperature raw=${rawValue} converted=${rawValue / 10}`);
        break;
      case 5: // Soil moisture (DP5)
        this.log(`[ZCL-DATA] TS0601_oitavov2.soil_moisture raw=${rawValue} converted=${rawValue}`);
        break;
      case 105: // Soil moisture alternate
        const moisture = rawValue > 100 ? Math.round(rawValue / 10) : rawValue;
        this.log(`[ZCL-DATA] TS0601_oitavov2.soil_moisture raw=${rawValue} converted=${moisture}`);
        break;
      case 15: // Battery
      case 4:
        this.log(`[ZCL-DATA] TS0601_oitavov2.battery raw=${rawValue} converted=${rawValue}`);
        break;
      default:
        if (dp !== undefined) {
          this.log(`[ZCL-DATA] TS0601_oitavov2.unknown_dp dp=${dp} raw=${rawValue}`);
        }
    }

    // Call parent handler
    super.onTuyaStatus(status);

    // Log final capability values
    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const soil = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      this.log(`[ZCL-DATA] TS0601_oitavov2 CAPABILITIES temp=${temp}°C soil=${soil}% battery=${bat}%`);
    }, 100);
  }
}

module.exports = SoilSensorDevice;
