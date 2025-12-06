'use strict';
const { HybridSensorBase } = require('../../lib/devices');

/**
 * Smart Smoke Detector Advanced
 *
 * v5.5.22: Added temperature and humidity DP mappings
 *
 * DP Mapping (from Zigbee2MQTT):
 * - DP1: alarm_smoke (boolean)
 * - DP2: measure_temperature (value / 10)
 * - DP3: measure_humidity (value)
 * - DP4: measure_battery (alternate)
 * - DP14: alarm_tamper
 * - DP15: measure_battery
 */
class SmokeDetectorAdvancedDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_smoke', 'measure_battery', 'measure_temperature', 'measure_humidity', 'alarm_tamper']; }

  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SMOKE ALARM (DP 1)
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_smoke', transform: (v) => v === 1 || v === true || v === 'alarm' },

      // ═══════════════════════════════════════════════════════════════════
      // ENVIRONMENTAL (DP 2, 3) - v5.5.22 FIX
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_temperature', divisor: 10 },
      3: { capability: 'measure_humidity', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (DP 4, 15)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER (DP 14)
      // ═══════════════════════════════════════════════════════════════════
      14: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SMOKE-ADV] ✅ Ready');
    this.log('[SMOKE-ADV] DP Mappings: smoke(1), temp(2), humidity(3), battery(4,15), tamper(14)');
  }
}
module.exports = SmokeDetectorAdvancedDevice;
