'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.583: CRITICAL FIX - Flow card run listeners were missing
 */
class RadarMotionSensorMmwaveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadarMotionSensorMmwaveDriver v5.5.583 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const conditionCards = [
      {
        id: 'motion_sensor_radar_mmwave_is_presence_detected',
        fn: async (args) => args.device.getCapabilityValue('alarm_motion') === true
      },
      {
        id: 'motion_sensor_radar_mmwave_illuminance_above',
        fn: async (args) => {
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux > (args.lux || 100);
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_illuminance_below',
        fn: async (args) => {
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux < (args.lux || 100);
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_temperature_above',
        fn: async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.temp || 25);
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_target_distance_less_than',
        fn: async (args) => {
          const distance = args.device.getCapabilityValue('measure_luminance.distance') || 0;
          return distance < (args.distance || 3);
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
          this.log(`[FLOW] ✅ Condition ${id} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] ⚠️ Condition ${id} registration error: ${err.message}`);
      }
    }

    const actionCards = [
      {
        id: 'motion_sensor_radar_mmwave_set_radar_sensitivity',
        fn: async (args) => {
          if (args.device.sendTuyaCommand) {
            await args.device.sendTuyaCommand(2, args.sensitivity || 5, 'value');
          }
          return true;
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_set_detection_range',
        fn: async (args) => {
          if (args.device.sendTuyaCommand) {
            await args.device.sendTuyaCommand(3, Math.round((args.min || 0) * 100), 'value');
            await args.device.sendTuyaCommand(4, Math.round((args.max || 6) * 100), 'value');
          }
          return true;
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_set_fading_time',
        fn: async (args) => {
          if (args.device.sendTuyaCommand) {
            await args.device.sendTuyaCommand(102, args.seconds || 30, 'value');
          }
          return true;
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_set_detection_delay',
        fn: async (args) => {
          if (args.device.sendTuyaCommand) {
            await args.device.sendTuyaCommand(101, args.seconds || 0, 'value');
          }
          return true;
        }
      }
    ];

    for (const { id, fn } of actionCards) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            return fn(args);
          });
          this.log(`[FLOW] ✅ Action ${id} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] ⚠️ Action ${id} registration error: ${err.message}`);
      }
    }

    this.log('[FLOW] mmWave radar motion sensor flow cards registered');
  }
}

module.exports = RadarMotionSensorMmwaveDriver;
