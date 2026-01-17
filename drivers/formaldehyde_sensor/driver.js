'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.582: CRITICAL FIX - Flow card run listeners were missing
 */
class FormaldehydeSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('FormaldehydeSensorDriver v5.5.582 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Formaldehyde above
    try {
      this.homey.flow.getConditionCard('formaldehyde_sensor_formaldehyde_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const level = args.device.getCapabilityValue('measure_formaldehyde') || 0;
          return level > (args.level || 50);
        });
      this.log('[FLOW] ✅ formaldehyde_sensor_formaldehyde_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Air quality good
    try {
      this.homey.flow.getConditionCard('formaldehyde_sensor_air_quality_good')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const formaldehyde = args.device.getCapabilityValue('measure_formaldehyde') || 0;
          return formaldehyde < 100; // Good air quality threshold
        });
      this.log('[FLOW] ✅ formaldehyde_sensor_air_quality_good');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Formaldehyde sensor flow cards registered');
  }
}

module.exports = FormaldehydeSensorDriver;
