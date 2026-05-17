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
    const conditionCards = [
      {
        id: 'presence_sensor_radar_is_present',
        fn: async (args) => args.device.getCapabilityValue('alarm_motion') === true
      },
      {
        id: 'presence_sensor_radar_illuminance_above',
        fn: async (args) => {
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux > (args.lux || 100);
        }
      },
      {
        id: 'presence_sensor_radar_distance_within',
        fn: async (args) => {
          const distance = args.device.getCapabilityValue('measure_luminance.distance') || 0;
          return distance <= (args.distance || 300);
        }
      }
    ];

    for (const { id, fn } of conditionCards) {
      try {
        const card = this.homey.flow.getConditionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return fn(args);
          });
          this.log(`[FLOW] ✅ Condition ${id} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] ⚠️ Condition ${id} registration error: ${err.message}`);
      }
    }

    this.log('[FLOW] Presence sensor radar flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
