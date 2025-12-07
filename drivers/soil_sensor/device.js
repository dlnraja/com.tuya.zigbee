'use strict';

const TuyaHybridDevice = require('../../lib/devices/TuyaHybridDevice');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            SOIL SENSOR - v5.5.46 TRUE HYBRID                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Uses TuyaHybridDevice base class with proper:                               ║
 * ║  - tuyaCluster handlers (Tuya DP reception via 0xEF00)                       ║
 * ║  - cluster handlers (Zigbee standard reception)                              ║
 * ║  - tuyaBoundCluster (Tuya DP commands to device)                             ║
 * ║  - Hybrid mode auto-detection after 15 min                                   ║
 * ║                                                                              ║
 * ║  KNOWN MODELS:                                                               ║
 * ║  - TS0601 / _TZE284_oitavov2 : QT-07S Soil moisture sensor                   ║
 * ║  - TS0601 / _TZE284_aao3yzhs : Soil sensor variant                           ║
 * ║                                                                              ║
 * ║  DP MAPPINGS (from Z2M/ZHA):                                                 ║
 * ║  - DP3: soil_moisture %                                                      ║
 * ║  - DP5: temperature ÷10                                                      ║
 * ║  - DP14: battery_state enum (0=low, 1=med, 2=high)                           ║
 * ║  - DP15: battery_percent %                                                   ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SoilSensorDevice extends TuyaHybridDevice {

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

  /**
   * v5.5.46: ZCL cluster handlers (cluster equivalent)
   * For Zigbee standard reports if device supports them
   */
  get clusterHandlers() {
    return {
      // Most soil sensors don't have standard ZCL clusters
      // But some may report battery via powerConfiguration
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            const battery = Math.round(data.batteryPercentageRemaining / 2);
            this.log(`[ZCL] Battery: ${battery}%`);
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('[SOIL] ════════════════════════════════════════════════════');
    this.log('[SOIL] Soil Sensor v5.5.46 TRUE HYBRID');
    this.log('[SOIL] ════════════════════════════════════════════════════');
    this.log('[SOIL] ⚠️ BATTERY DEVICE - Data comes when device wakes up');
    this.log('[SOIL] ℹ️ First data may take 10-60 minutes after pairing');
  }

  /**
   * v5.5.46: Clean up
   */
  onDeleted() {
    super.onDeleted();
    this.log('[SOIL] Device deleted');
  }
}

module.exports = SoilSensorDevice;
