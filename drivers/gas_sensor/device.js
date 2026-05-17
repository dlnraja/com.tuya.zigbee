'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * 
 *       GAS SENSOR - v5.5.130 ENRICHED (Zigbee2MQTT features)                  
 * 
 *   Source: https://www.zigbee2mqtt.io/devices/TS0601_gas_sensor_2.html        
 *   Features: gas, gas_value, self_test, silence, alarm_ringtone, alarm_time   
 * 
 */
class GasSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return true; }

  get sensorCapabilities() {
    return ['alarm_gas', 'alarm_co', 'measure_battery', 'alarm_tamper'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0601_gas_sensor_2
   */
  get dpMappings() {
    return {
      // 
      // GAS ALARM & MEASUREMENT
      // 
      1: { capability: 'alarm_gas', transform: (v) => v === 1 || v === true || v === 'alarm' },
      2: { capability: 'measure_gas', divisor: 1 }, // Gas value (LEL)
      3: { capability: 'alarm_co', transform: (v) => v === 1 || v === true },

      // 
      // BATTERY & STATUS
      // 
      4: { capability: 'measure_battery', divisor: 1 },
      9: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === 'fault' },
      14: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === 'low' }, // SDK3: alarm_battery obsolÃ¨te

      // 
      // v5.5.130: CONTROL FEATURES from Zigbee2MQTT
      // 
      // Preheat indicator (device warming up)
      10: { internal: true, type: 'preheat' },
      // Fault alarm status
      11: { capability: 'alarm_generic', transform: (v) => v !== 0 && v !== 'normal' },
      // Silence the alarm (writable)
      13: { setting: 'silence', writable: true },
      // Sensitivity setting
      16: { setting: 'sensitivity', writable: true },
      // Self-test trigger (writable)
      8: { setting: 'self_test', writable: true },
      // Self-test result (checking, success, failure, others)
      12: { internal: true, type: 'self_test_result' },
      // Alarm ringtone (melody_1 to melody_5)
      21: { setting: 'alarm_ringtone' },
      // Alarm time (1-180 seconds)
      7: { setting: 'alarm_time' },
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }
    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
    this.log('[GAS] v5.5.292 - DPs: 1,2,3,4,9-11,13,14,16 | ZCL: IAS,PWR,EF00');
    this.log('[GAS]  Ready');
    // v5.5.292: Flow triggers now handled by UnifiedSensorBase._triggerCustomFlowsIfNeeded()
  }

  async silenceAlarm() {
    try {
      const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (tuya?.datapoint) await tuya.datapoint({ dp: 13, value: true, type: 'bool' });
      this.log('[GAS]  Alarm silenced');
    } catch (e) { this.log('[GAS] Silence failed:', e.message); }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = GasSensorDevice;

