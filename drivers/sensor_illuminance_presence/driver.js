'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * sensor_illuminance_presence Driver - v5.5.580
 * Standardized flow card registration for Radar/Presence sensor.
 */
class SensorIlluminancePresenceDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SensorIlluminancePresenceDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const conditionCards = [
      {
        id: 'sensor_illuminance_presence_is_present',
        fn: async (args) => args.device.getCapabilityValue('alarm_motion') === true
      },
      {
        id: 'sensor_illuminance_presence_illuminance_above',
        fn: async (args) => {
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux > (args.lux || 100);
        }
      },
      {
        id: 'sensor_illuminance_presence_distance_within',
        fn: async (args) => {
          const distance = args.device.getCapabilityValue('measure_luminance.distance') || 0;
          return distance <= (args.distance || 300);
        }
      },
      {
        id: 'sensor_illuminance_presence_motion_active',
        fn: async (args) => args.device.getCapabilityValue('alarm_motion') === true
      }
    ];

    for (const { id, fn } of conditionCards) {
      try {
        const card = this.homey.flow.getConditionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            return fn(args);
          });
          this.log(`[FLOW] ✅ Condition ${id} registered`);
        }
      } catch (err) {
        if (this.developerDebugMode) { this.error(`[FLOW] ⚠️ Condition ${id} registration error: ${err.message}`); };
      }
    }

    this.log('[FLOW] sensor_illuminance_presence flow cards registered');
  }
}

module.exports = SensorIlluminancePresenceDriver;
