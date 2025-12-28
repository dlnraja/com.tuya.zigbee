'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      WATER LEAK SENSOR - v5.5.130 ENRICHED (Zigbee2MQTT features)           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0207_water_leak_detector.html ║
 * ║  Features: water_leak, battery, tamper, temperature                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class WaterLeakSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_water', 'measure_battery', 'alarm_tamper'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0207_water_leak_detector
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // WATER LEAK DETECTION
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_water', transform: (v) => v === 1 || v === true || v === 'alarm' },
      101: { capability: 'alarm_water', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' }, // SDK3: alarm_battery obsolète
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER DETECTION
      // ═══════════════════════════════════════════════════════════════════
      5: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: ADDITIONAL FEATURES (some water sensors have temp)
      // ═══════════════════════════════════════════════════════════════════
      // Temperature (some models like TS0601_water_sensor)
      2: { capability: 'measure_temperature', divisor: 10 },
      // Battery voltage (mV) - for diagnostic purposes
      6: { capability: null, internal: 'battery_voltage' },
      // Sensitivity setting
      9: { capability: null, setting: 'sensitivity' },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[WATER] v5.5.290 - DPs: 1,4,5,14,15,101 | ZCL: IAS,PWR,EF00');
    this.log('[WATER] ✅ Water leak sensor ready');

    // v5.5.290: Register listener to trigger custom flow cards
    this._lastWaterAlarm = null;
    this.registerCapabilityListener('alarm_water', async (value) => {
      if (value && this._lastWaterAlarm !== true) {
        await this._triggerWaterFlows(true);
      } else if (!value && this._lastWaterAlarm === true) {
        await this._triggerWaterFlows(false);
      }
      this._lastWaterAlarm = value;
    });
  }

  /**
   * v5.5.290: Trigger custom water leak flow cards
   */
  async _triggerWaterFlows(detected) {
    try {
      if (detected) {
        await this.homey.flow.getDeviceTriggerCard('water_leak_detected')
          .trigger(this, { water: true }).catch(() => { });
        this.log('[WATER] 💧 Flow triggered: water_leak_detected');
      } else {
        await this.homey.flow.getDeviceTriggerCard('water_leak_cleared')
          .trigger(this, { water: false }).catch(() => { });
        this.log('[WATER] ✅ Flow triggered: water_leak_cleared');
      }
    } catch (err) {
      this.log('[WATER] ⚠️ Flow trigger error:', err.message);
    }
  }
}

module.exports = WaterLeakSensorDevice;
