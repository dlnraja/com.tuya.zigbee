'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * Gas Detector Device - TS0601 Tuya DP Protocol
 * 
 * v5.5.932: Enhanced DP mappings for _TZE204_chbyv06x (Vitalii forum report)
 * Source: Zigbee2MQTT TS0601_gas_sensor_2
 * 
 * DP MAPPINGS:
 * - DP1: gas alarm (bool) - main alarm_gas capability
 * - DP2: gas_value (LEL %) - concentration level
 * - DP7: alarm_time (1-180s)
 * - DP8: self_test (bool)
 * - DP9: self_test_result (enum: 0=checking, 1=success, 2=failure, 3=others)
 * - DP10: preheat (bool) - sensor warming up
 * - DP16: silence (bool) - mute alarm
 * - DP21: alarm_ringtone (enum: 0-4 = melody_1 to melody_5)
 */
class GasDetectorDevice extends UnifiedSensorBase {
  get mainsPowered() { return true; }
  get sensorCapabilities() { return ['alarm_gas']; }
  
  get dpMappings() {
    const device = this;
    return {
      // DP1: Gas alarm (primary)
      1: { 
        capability: 'alarm_gas', 
        transform: (v) => v === 1 || v === true || v === 'alarm'
      },
      // DP2: Gas concentration value (LEL %)
      2: { internal: true, type: 'gas_value',
        transform: (v) => {
          device.log(`[GAS]  Gas concentration: ${v} LEL%`);
          // Store for diagnostics, trigger alarm if high
          device._gasValue = v;
          if (v > 10) { // High gas level threshold
            device.setCapabilityValue('alarm_gas', true).catch(() => {});
          }
          return v;
        }
      },
      // DP7: Alarm duration time (seconds)
      7: { internal: true, type: 'alarm_time',
        transform: (v) => {
          device.log(`[GAS]  Alarm time: ${v}s`);
          return v;
        }
      },
      // DP8: Self-test trigger
      8: { internal: true, type: 'self_test',
        transform: (v) => {
          device.log(`[GAS]  Self-test: ${v ? 'active' : 'inactive'}`);
          return v === 1 || v === true;
        }
      },
      // DP9: Self-test result
      9: { internal: true, type: 'self_test_result',
        transform: (v) => {
          const results = ['checking', 'success', 'failure', 'others'];
          const result = results[v] || 'unknown';
          device.log(`[GAS]  Self-test result: ${result}`);
          return result;
        }
      },
      // DP10: Preheat status (sensor warming up)
      10: { internal: true, type: 'preheat',
        transform: (v) => {
          const preheating = v === 1 || v === true;
          device.log(`[GAS]  Preheat: ${preheating ? 'warming up' : 'ready'}`);
          return preheating;
        }
      },
      // DP16: Silence alarm
      16: { internal: true, type: 'silence',
        transform: (v) => {
          device.log(`[GAS]  Silence: ${v ? 'muted' : 'unmuted'}`);
          return v === 1 || v === true;
        }
      },
      // DP21: Alarm ringtone selection
      21: { internal: true, type: 'alarm_ringtone',
        transform: (v) => {
          const melodies = ['melody_1', 'melody_2', 'melody_3', 'melody_4', 'melody_5'];
          const melody = melodies[v] || 'melody_1';
          device.log(`[GAS]  Ringtone: ${melody}`);
          return melody;
        }
      }
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
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injectedthis.log('[GAS-DETECTOR] v5.5.932  Ready');
    this.log('[GAS-DETECTOR] Manufacturer:', this.getSetting('zb_manufacturer_name') || 'unknown');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = GasDetectorDevice;
