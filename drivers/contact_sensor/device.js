'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      CONTACT / DOOR SENSOR - v5.5.130 ENRICHED (Zigbee2MQTT features)       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0203.html                     ║
 * ║  Features: contact, battery, voltage, tamper, battery_low                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ContactSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_contact', 'measure_battery', 'alarm_tamper'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0203
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // CONTACT STATE
      // ═══════════════════════════════════════════════════════════════════
      // Contact state - DP 1 (0=open, 1=closed for most)
      1: {
        capability: 'alarm_contact',
        transform: (v) => {
          if (typeof v === 'boolean') return v;
          return v === 0 || v === 'open';
        }
      },
      // Alternative contact DP - DP 101
      101: { capability: 'alarm_contact', transform: (v) => v === true || v === 1 || v === 'open' },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (multiple DPs depending on model)
      // ═══════════════════════════════════════════════════════════════════
      // Battery level - DP 2
      2: { capability: 'measure_battery', divisor: 1 },
      // Battery state - DP 3 (enum: 0=normal, 1=low) - SDK3: alarm_battery obsolète, utiliser internal
      3: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      // Battery alt - DP 4
      4: { capability: 'measure_battery', divisor: 1 },
      // Battery alt2 - DP 15
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER DETECTION
      // ═══════════════════════════════════════════════════════════════════
      5: { capability: 'alarm_tamper', transform: (v) => v === true || v === 1 },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: ADDITIONAL FEATURES from Zigbee2MQTT
      // ═══════════════════════════════════════════════════════════════════
      // Battery voltage (mV) - for diagnostic purposes
      6: { capability: null, internal: 'battery_voltage' },
      // Sensitivity setting (some models)
      9: { capability: null, setting: 'sensitivity' },
      // Report interval (some models)
      10: { capability: null, setting: 'report_interval' },
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles EVERYTHING: Tuya DP, ZCL, IAS Zone, battery
    await super.onNodeInit({ zclNode });
    this.log('[CONTACT] v5.5.129 - DPs: 1,2,3,4,5,15,101 | ZCL: IAS,PWR,EF00');
    this.log('[CONTACT] ✅ Contact sensor ready');
  }
}

module.exports = ContactSensorDevice;
