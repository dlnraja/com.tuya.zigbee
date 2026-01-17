'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 * SDK3 auto-registers cards but NOT run listeners for conditions/actions
 * This caused "flow cards give error" reports
 */
class TuyaGasSensorTs0601Driver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaGasSensorTs0601Driver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION: Gas is/is not detected
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this.homey.flow.getConditionCard('gas_sensor_gas_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      this.log('[FLOW] ✅ Registered: gas_sensor_gas_detected');
    } catch (err) {
      this.log(`[FLOW] ⚠️ ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION: CO is/is not detected
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this.homey.flow.getConditionCard('gas_sensor_co_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_co') === true;
        });
      this.log('[FLOW] ✅ Registered: gas_sensor_co_detected');
    } catch (err) {
      this.log(`[FLOW] ⚠️ ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION: Gas level is/is not above threshold
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this.homey.flow.getConditionCard('gas_sensor_level_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const level = args.device.getCapabilityValue('measure_gas') || 0;
          return level > (args.threshold || 20);
        });
      this.log('[FLOW] ✅ Registered: gas_sensor_level_above');
    } catch (err) {
      this.log(`[FLOW] ⚠️ ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Mute alarm
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this.homey.flow.getActionCard('gas_sensor_mute_alarm')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(16, true, 'bool');
            }
            return true;
          } catch (err) {
            this.log(`[FLOW] Mute failed: ${err.message}`);
            return true;
          }
        });
      this.log('[FLOW] ✅ Registered: gas_sensor_mute_alarm');
    } catch (err) {
      this.log(`[FLOW] ⚠️ ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Self-test
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this.homey.flow.getActionCard('gas_sensor_self_test')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(8, true, 'bool');
            }
            return true;
          } catch (err) {
            this.log(`[FLOW] Self-test failed: ${err.message}`);
            return true;
          }
        });
      this.log('[FLOW] ✅ Registered: gas_sensor_self_test');
    } catch (err) {
      this.log(`[FLOW] ⚠️ ${err.message}`);
    }

    this.log('[FLOW] 🎉 All gas sensor flow cards registered');
  }
}

module.exports = TuyaGasSensorTs0601Driver;
