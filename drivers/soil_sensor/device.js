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
   * v5.3.99: CORRECTED from ZHA quirks
   * Source: https://community.home-assistant.io/t/troubleshooting-tze284-temp-humid-sensor-custom-quirk-in-zha/828046
   *
   * CRITICAL: DP 3 = Soil Moisture, DP 5 = Temperature (ZHA SoilManufCluster)
   * Converter uses x*100 which means raw values are in whole units
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // v5.3.99: CORRECTED FROM ZHA QUIRKS
      // DP 3 = SOIL MOISTURE (not temperature!)
      // DP 5 = TEMPERATURE (not moisture!)
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_humidity', divisor: 1 },       // Soil Moisture %
      5: { capability: 'measure_temperature', divisor: 10 },   // Soil Temperature

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (DP 4, 15) - ZHA quirk shows x*2 multiplier!
      // Device reports HALF the actual battery percentage
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },
      15: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },
      102: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },

      // ═══════════════════════════════════════════════════════════════════
      // ADDITIONAL DPs
      // ═══════════════════════════════════════════════════════════════════
      110: { capability: null, setting: 'unknown_110' },

      // ═══════════════════════════════════════════════════════════════════
      // BUTTON PRESS
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
