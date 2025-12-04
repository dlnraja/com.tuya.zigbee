'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Soil Sensor Device - v5.3.97 UPDATED FROM Z2M
 * Source: https://github.com/Koenkk/zigbee-herdsman-converters/pull/7609
 *
 * _TZE284_oitavov2, _TZE284_g2e6cpnw and similar soil sensors
 */
class SoilSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * v5.3.97: COMPLETE DP mappings from Z2M research
   * Note: Temperature uses /100 (not /10) based on user reports!
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SOIL TEMPERATURE (DP 3) - /100 based on HA community feedback
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_temperature', divisor: 100 },

      // ═══════════════════════════════════════════════════════════════════
      // SOIL MOISTURE (DP 5) - Value in 0.1% units, so /10
      // ═══════════════════════════════════════════════════════════════════
      5: { capability: 'measure_humidity', divisor: 10 },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (DP 4, 15, 102)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      102: { capability: 'measure_battery', divisor: 1 }, // Some models

      // ═══════════════════════════════════════════════════════════════════
      // ADDITIONAL DPs (from Z2M pull request)
      // ═══════════════════════════════════════════════════════════════════
      110: { capability: null, setting: 'unknown_110' }, // Unknown - might be sensor EC or other

      // ═══════════════════════════════════════════════════════════════════
      // BUTTON PRESS (if device has button)
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: 'button', transform: () => true },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SOIL] ✅ Soil sensor ready');
    this.log('[SOIL] Note: Press button on device to force data transmission');
  }
}

module.exports = SoilSensorDevice;
