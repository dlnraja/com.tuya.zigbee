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
    // WHY(P2526 / VicHY 74e5cae7): register ALL compose conditions — motion_active was
    // declared but never wired; users confuse native motion WHEN vs custom presence WHEN.
    // WHY(P2534 / #2240): warm trigger cards so getDeviceTriggerCard().trigger works after tip.
    for (const id of [
      'presence_sensor_radar_presence_detected',
      'presence_sensor_radar_presence_cleared',
      'presence_sensor_radar_motion_detected',
      'presence_sensor_radar_zone1_presence',
      'presence_sensor_radar_zone2_presence',
      'presence_sensor_radar_zone3_presence',
    ]) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
      } catch (_e) { /* soft — compose may omit zone cards */ }
    }
    const conditionCards = [
      {
        // WHY(P2524): condition must accept alarm_human OR alarm_motion (presence≡motion)
        id: 'presence_sensor_radar_is_present',
        fn: async (args) => {
          const d = args.device;
          return d.getCapabilityValue('alarm_motion') === true
            || d.getCapabilityValue('alarm_human') === true;
        }
      },
      {
        id: 'presence_sensor_radar_motion_active',
        fn: async (args) => {
          const d = args.device;
          return d.getCapabilityValue('alarm_motion') === true
            || d.getCapabilityValue('alarm_human') === true;
        }
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
      },
      {
        id: 'presence_sensor_radar_zone_active',
        fn: async (args) => {
          const z = String(args.zone || '1');
          const cap = `alarm_motion.zone${z}`;
          return args.device.getCapabilityValue(cap) === true;
        }
      },
      {
        id: 'presence_sensor_radar_movement_is',
        fn: async (args) => {
          const want = String(args.classification || 'none');
          const got = String(args.device.getCapabilityValue('measure_motion.classification') || 'none');
          return got === want;
        }
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
          this.log(`[FLOW] Condition ${id} registered`);
        }
      } catch (err) {
        if (this.developerDebugMode) { this.error(`[FLOW] Condition ${id} registration error: ${err.message}`); }
      }
    }

    // WHY(P2589): Flow action — clear stuck Occupied without unplug (same Contre quoi as ZHA refresh)
    try {
      const clearCard = this.homey.flow.getActionCard('presence_sensor_radar_clear_presence');
      if (clearCard) {
        clearCard.registerRunListener(async (args) => {
          const d = args.device;
          if (!d) return false;
          if (typeof d.forceClearPresence === 'function') {
            await d.forceClearPresence();
          } else if (typeof d.clearStuckPresence === 'function') {
            await d.clearStuckPresence({ source: 'flow' });
          } else {
            return false;
          }
          return true;
        });
        this.log('[FLOW] Action presence_sensor_radar_clear_presence registered');
      }
    } catch (err) {
      if (this.developerDebugMode) {
        this.error(`[FLOW] clear_presence registration error: ${err.message}`);
      }
    }

    this.log('[FLOW] Presence sensor radar flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
