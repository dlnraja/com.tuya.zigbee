'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class GasDetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('GasDetectorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Gas is/is not detected
    try {
      this.homey.flow.getConditionCard('gas_detector_gas_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      this.log('[FLOW] ✅ gas_detector_gas_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: CO is/is not detected
    try {
      this.homey.flow.getConditionCard('gas_detector_co_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_co') === true;
        });
      this.log('[FLOW] ✅ gas_detector_co_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Test detector
    try {
      this.homey.flow.getActionCard('gas_detector_test')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(8, true, 'bool');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ gas_detector_test');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Mute alarm
    try {
      this.homey.flow.getActionCard('gas_detector_mute')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(16, true, 'bool');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ gas_detector_mute');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Gas detector flow cards registered');
  }
}

module.exports = GasDetectorDriver;
