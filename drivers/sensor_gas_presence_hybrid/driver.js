'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.580: CRITICAL FIX - Flow card run listeners were missing
 */
class PresenceSensorRadarDriver extends ZigBeeDriver {
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


    this.log('PresenceSensorRadarDriver v5.5.580 initialized');
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Is present
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      this.log('[FLOW] ✅ presence_sensor_radar_is_present');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Illuminance above
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux > (args.lux || 100);
        });
      this.log('[FLOW] ✅ presence_sensor_radar_illuminance_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Distance within
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const distance = args.device.getCapabilityValue('measure_luminance.distance') || 0;
          return distance <= (args.distance || 300);
        });
      this.log('[FLOW] ✅ presence_sensor_radar_distance_within');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] Presence sensor radar flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
