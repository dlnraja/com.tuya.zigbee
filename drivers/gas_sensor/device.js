'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      GAS SENSOR - v5.5.130 ENRICHED (Zigbee2MQTT features)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0601_gas_sensor_2.html        ║
 * ║  Features: gas, gas_value, self_test, silence, alarm_ringtone, alarm_time   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class GasSensorDevice extends HybridSensorBase {

  get mainsPowered() { return true; }

  get sensorCapabilities() {
    return ['alarm_gas', 'alarm_co', 'measure_battery', 'alarm_tamper'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0601_gas_sensor_2
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // GAS ALARM & MEASUREMENT
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_gas', transform: (v) => v === 1 || v === true || v === 'alarm' },
      2: { capability: 'measure_gas', divisor: 1 }, // Gas value (LEL)
      3: { capability: 'alarm_co', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY & STATUS
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },
      9: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === 'fault' },
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' }, // SDK3: alarm_battery obsolète

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: CONTROL FEATURES from Zigbee2MQTT
      // ═══════════════════════════════════════════════════════════════════
      // Preheat indicator (device warming up)
      10: { capability: null, internal: 'preheat' },
      // Fault alarm status
      11: { capability: 'alarm_generic', transform: (v) => v !== 0 && v !== 'normal' },
      // Silence the alarm (writable)
      13: { capability: null, setting: 'silence', writable: true },
      // Sensitivity setting
      16: { capability: null, setting: 'sensitivity', writable: true },
      // Self-test trigger (writable)
      8: { capability: null, setting: 'self_test', writable: true },
      // Self-test result (checking, success, failure, others)
      12: { capability: null, internal: 'self_test_result' },
      // Alarm ringtone (melody_1 to melody_5)
      21: { capability: null, setting: 'alarm_ringtone' },
      // Alarm time (1-180 seconds)
      7: { capability: null, setting: 'alarm_time' },
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles: IAS Zone, battery, Tuya DP
    await super.onNodeInit({ zclNode });
    this.log('[GAS] v5.5.290 - DPs: 1,2,3,4,9-11,13,14,16 | ZCL: IAS,PWR,EF00');
    this.log('[GAS] ✅ Ready');

    // v5.5.290: Register listener to trigger custom flow cards
    this._lastGasAlarm = null;
    this.registerCapabilityListener('alarm_gas', async (value) => {
      if (value && this._lastGasAlarm !== true) {
        await this._triggerGasFlows(true);
      } else if (!value && this._lastGasAlarm === true) {
        await this._triggerGasFlows(false);
      }
      this._lastGasAlarm = value;
    });
  }

  /**
   * v5.5.290: Trigger custom gas alarm flow cards
   */
  async _triggerGasFlows(detected) {
    try {
      if (detected) {
        await this.homey.flow.getDeviceTriggerCard('gas_alarm_triggered')
          .trigger(this, { gas: true }).catch(() => { });
        this.log('[GAS] ⛽ Flow triggered: gas_alarm_triggered');
      } else {
        await this.homey.flow.getDeviceTriggerCard('gas_alarm_cleared')
          .trigger(this, { gas: false }).catch(() => { });
        this.log('[GAS] ✅ Flow triggered: gas_alarm_cleared');
      }
    } catch (err) {
      this.log('[GAS] ⚠️ Flow trigger error:', err.message);
    }
  }

  async silenceAlarm() {
    try {
      const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (tuya?.datapoint) await tuya.datapoint({ dp: 13, value: true, type: 'bool' });
      this.log('[GAS] 🔇 Alarm silenced');
    } catch (e) { this.log('[GAS] Silence failed:', e.message); }
  }
}

module.exports = GasSensorDevice;
