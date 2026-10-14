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
        id: 'motion_sensor_radar_mmwave_target_distance_l_9897d',
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
        if (this.developerDebugMode) { this.error(`[FLOW] ⚠️ Condition ${id} registration error: ${err.message}`); }
      }
    }

    const actionCards = [
      {
        id: 'motion_sensor_radar_mmwave_set_radar_sensitivity',
        fn: async (args) => {
          const d = args.device;
          // WHY(P2818/ZHA#5286): gnpflcoq uses DP9 enum — generic mmWave still DP2
          if (typeof d.sendGnpflcoqSetting === 'function' && d._isGnpflcoq4in1?.()) {
            await d.sendGnpflcoqSetting('radar_sensitivity', args.sensitivity || 5);
          } else if (d.sendTuyaCommand) {
            await d.sendTuyaCommand(2, args.sensitivity || 5, 'value');
          }
          return true;
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_set_detection_range',
        fn: async (args) => {
          // gnpflcoq has no range DPs 3/4 (ZHA#5286) — soft no-op
          if (args.device._isGnpflcoq4in1?.()) return true;
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
          const d = args.device;
          // WHY(P2818): never DP102 on gnpflcoq (temp_compensate) — use DP12 pir_delay
          if (typeof d.sendGnpflcoqSetting === 'function' && d._isGnpflcoq4in1?.()) {
            await d.sendGnpflcoqSetting('fading_time', args.seconds || 60);
          } else if (d.sendTuyaCommand) {
            await d.sendTuyaCommand(102, args.seconds || 30, 'value');
          }
          return true;
        }
      },
      {
        id: 'motion_sensor_radar_mmwave_set_detection_delay',
        fn: async (args) => {
          const d = args.device;
          if (typeof d.sendGnpflcoqSetting === 'function' && d._isGnpflcoq4in1?.()) {
            await d.sendGnpflcoqSetting('detection_delay', args.seconds || 10);
          } else if (d.sendTuyaCommand) {
            await d.sendTuyaCommand(101, args.seconds || 0, 'value');
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
        if (this.developerDebugMode) { this.error(`[FLOW] ⚠️ Action ${id} registration error: ${err.message}`); }
      }
    }

    this.log('[FLOW] mmWave radar motion sensor flow cards registered');
  }
}

module.exports = RadarMotionSensorMmwaveDriver;
