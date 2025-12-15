'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * v5.5.179: DEDICATED DRIVER FOR _TZE284_vvmbj46n - HYBRID MODE
 *
 * CRITICAL: Uses HybridSensorBase for BOTH Tuya DP AND ZCL handling!
 *
 * TECHNICAL FACTS (from Zigbee interview):
 * - Tuya proprietary TS0601 device
 * - Battery powered end device (sleepy)
 * - Uses Tuya private cluster 0xEF00 for DP data
 * - ALSO supports ZCL standard clusters for temp/humidity/battery
 * - Time cluster (0x000A) is OUTPUT ONLY - time sync via Tuya DP
 *
 * DP MAPPINGS (from Z2M TH05Z):
 * - DP 1: Temperature (value/10 = °C)
 * - DP 2: Humidity (direct %)
 * - DP 4: Battery (value*2, capped at 100)
 * - DP 9: Temperature unit (0=C, 1=F)
 *
 * ZCL CLUSTERS (also available):
 * - temperatureMeasurement (0x0402): measuredValue/100 = °C
 * - relativeHumidity (0x0405): measuredValue/100 = %
 * - powerConfiguration (0x0001): batteryPercentageRemaining/2 = %
 */

class ClimateBoxVvmbj46nDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Use Tuya DP for battery (DP4) */
  get usesTuyaDPBattery() { return true; }
  get skipZclBatteryPolling() { return true; }

  /** FORCE ACTIVE MODE - query DPs even if cluster not visible */
  get forceActiveTuyaMode() { return true; }

  /** TRUE HYBRID mode - listen to BOTH ZCL AND Tuya DP */
  get hybridModeEnabled() { return true; }

  /** Capabilities for this sensor */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * v5.5.179: DP MAPPINGS for _TZE284_vvmbj46n (TH05Z LCD)
   * Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
   */
  get dpMappings() {
    return {
      // Temperature: DP1, value/10 = °C
      1: { capability: 'measure_temperature', divisor: 10 },

      // Humidity: DP2, direct %
      2: { capability: 'measure_humidity', divisor: 1 },

      // Battery: DP4, value*2 (device reports half)
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },

      // Config DPs (not capabilities)
      9: { capability: null, setting: 'temperature_unit' },       // 0=C, 1=F
      10: { capability: null, setting: 'max_temp_alarm' },        // Max temp threshold
      11: { capability: null, setting: 'min_temp_alarm' },        // Min temp threshold
      12: { capability: null, setting: 'max_humidity_alarm' },    // Max humidity threshold
      13: { capability: null, setting: 'min_humidity_alarm' },    // Min humidity threshold
      14: { capability: null },                                    // Temp alarm status
      15: { capability: null },                                    // Humidity alarm status (NOT battery!)
      17: { capability: null, setting: 'temp_report_interval' },  // Report interval
      18: { capability: 'measure_temperature', divisor: 10 },     // Alternative temp DP
      19: { capability: null, setting: 'temp_sensitivity' },      // Temp sensitivity
      20: { capability: null, setting: 'humidity_sensitivity' },  // Humidity sensitivity
    };
  }

  /**
   * v5.5.179: ZCL cluster handlers - HYBRID mode
   * Device supports standard ZCL clusters too!
   */
  get clusterHandlers() {
    return {
      // Temperature - ZCL cluster (0x0402), value/100 = °C
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const temp = data.measuredValue / 100;
            if (temp >= -40 && temp <= 80) {
              this.log(`[ZCL] 🌡️ Temperature: ${temp}°C`);
              this.setCapabilityValue('measure_temperature', temp).catch(() => { });
            }
          }
        }
      },

      // Humidity - ZCL cluster (0x0405), value/100 = %
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const humidity = data.measuredValue / 100;
            if (humidity >= 0 && humidity <= 100) {
              this.log(`[ZCL] 💧 Humidity: ${humidity}%`);
              this.setCapabilityValue('measure_humidity', humidity).catch(() => { });
            }
          }
        }
      },

      // Battery - ZCL cluster (0x0001), value/2 = %
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            let battery = Math.round(data.batteryPercentageRemaining / 2);
            battery = Math.max(0, Math.min(100, battery));
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  /**
   * v5.5.179: Enhanced initialization with time sync
   */
  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║  CLIMATE BOX _TZE284_vvmbj46n - HYBRID DRIVER v5.5.179           ║');
    this.log('║  Tuya DP + ZCL HYBRID - Time Sync via Tuya DP                    ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Call parent initialization (sets up Tuya DP + ZCL listeners)
    await super.onNodeInit({ zclNode });

    // Store device info
    await this.setSettings({
      device_manufacturer: '_TZE284_vvmbj46n',
      device_model: 'TS0601'
    }).catch(() => { });

    this.log('[INIT] ✅ Climate Box ready - HYBRID mode (Tuya DP + ZCL)');
  }

  /**
   * Handle settings change
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SETTINGS] Changed:', changedKeys);

    // Offsets will be applied on next data reception
    if (changedKeys.includes('temperature_offset') || changedKeys.includes('humidity_offset')) {
      this.log('[SETTINGS] Offsets updated - will apply on next data');
    }
  }

  /**
   * Cleanup on delete
   */
  async onDeleted() {
    this.log('[DELETED] Climate Box device removed');

    // Call parent cleanup
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = ClimateBoxVvmbj46nDevice;
