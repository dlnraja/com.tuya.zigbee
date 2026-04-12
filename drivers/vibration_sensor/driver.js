'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class VibrationSensorDriver extends ZigBeeDriver {
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
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('VibrationSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Vibration is/is not detected
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_vibration') === true;
        });
      this.log('[FLOW] ✅ vibration_sensor_is_vibrating');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Battery above threshold
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
      this.log('[FLOW] ✅ vibration_sensor_battery_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Vibration active
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_vibration') === true;
        });
      this.log('[FLOW] ✅ vibration_sensor_vibration_active');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Tamper active
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_tamper') === true;
        });
      this.log('[FLOW] ✅ vibration_sensor_tamper_active');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Vibration sensor flow cards registered (v5.11.47)');
  }
}

module.exports = VibrationSensorDriver;
