'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.580: CRITICAL FIX - Flow card run listeners were missing
 */
class RainSensorDriver extends ZigBeeDriver {
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

    this.log('RainSensorDriver v5.5.580 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Is raining
    try {
      (() => { try { return this.homey.flow.getConditionCard('rain_sensor_is_raining'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      this.log('[FLOW] ✅ Registered: rain_sensor_is_raining');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Rain intensity above
    try {
      (() => { try { return this.homey.flow.getConditionCard('rain_sensor_rain_intensity_above'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const intensity = args.device.getCapabilityValue('measure_rain') || 0;
          return intensity > (args.intensity || 50);
        });
      this.log('[FLOW] ✅ Registered: rain_sensor_rain_intensity_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Rain sensor flow cards registered');
  }
}

module.exports = RainSensorDriver;
