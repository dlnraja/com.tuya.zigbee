'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.580: CRITICAL FIX - Flow card run listeners were missing
 */
class PresenceSensorRadarDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PresenceSensorRadarDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is present
    try {
      const card = this.homey.flow.getConditionCard('presence_sensor_radar_is_present');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
        this.log('[FLOW] ✅ presence_sensor_radar_is_present registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register presence_sensor_radar_is_present:', err.message);
    }

    // CONDITION: Illuminance above
    try {
      const card = this.homey.flow.getConditionCard('presence_sensor_radar_illuminance_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux > (args.lux || 100);
        });
        this.log('[FLOW] ✅ presence_sensor_radar_illuminance_above registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register presence_sensor_radar_illuminance_above:', err.message);
    }

    // CONDITION: Distance within
    try {
      const card = this.homey.flow.getConditionCard('presence_sensor_radar_distance_within');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const distance = args.device.getCapabilityValue('measure_luminance.distance') || 0;
          return distance <= (args.distance || 300);
        });
        this.log('[FLOW] ✅ presence_sensor_radar_distance_within registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register presence_sensor_radar_distance_within:', err.message);
    }

    this.log('[FLOW] Presence sensor radar flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
