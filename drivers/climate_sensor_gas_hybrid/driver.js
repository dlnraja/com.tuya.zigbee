'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class GasDetectorDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }


  async onInit() {
    this.log('GasDetectorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Gas is/is not detected
    try {
      (() => { try { return (() => { try { return this.homey.flow.getConditionCard('gas_detector_gas_is_detected'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      this.log('[FLOW] ✅ gas_detector_gas_is_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: CO is/is not detected
    try {
      (() => { try { return (() => { try { return this.homey.flow.getConditionCard('gas_detector_co_is_detected'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_co') === true;
        });
      this.log('[FLOW] ✅ gas_detector_co_is_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Test detector
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('gas_detector_test'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
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
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('gas_detector_mute'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
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

    this.log('[FLOW]  Gas detector flow cards registered');
  }
}

module.exports = GasDetectorDriver;
