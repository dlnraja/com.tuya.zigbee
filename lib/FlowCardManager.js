'use strict';

/**
 * Flow Card Manager
 * Centralise la gestion des flow cards pour tous les devices
 */

class FlowCardManager {
  constructor(homey) {
    this.homey = homey;
    this.triggers = {};
    this.actions = {};
    this.conditions = {};
  }

  /**
   * Enregistre tous les flow cards au demarrage de l app
   */
  registerAll() {
    this.registerMotionSensorCards();
    this.registerSmartPlugCards();
    this.registerButtonCards();
    this.registerTemperatureSensorCards();
    this.registerDeviceHealthCards();
  }

  /**
   * MOTION SENSOR FLOW CARDS
   */
  registerMotionSensorCards() {
    // WHEN: Motion detected with specific lux level
    try {
      this.triggers.motion_alarm_lux = this.homey.flow.getDeviceTriggerCard('motion_alarm_lux');
      if (this.triggers.motion_alarm_lux) {
        this.triggers.motion_alarm_lux.registerRunListener(async (args, state) => {
          const lux = state.lux || 0;
          return lux >= args.lux_min && lux <= args.lux_max;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card motion_alarm_lux not available yet');
    }

    // WHEN: No motion for X minutes
    try {
      this.triggers.no_motion_timeout = this.homey.flow.getDeviceTriggerCard('no_motion_timeout');
      if (this.triggers.no_motion_timeout) {
        this.triggers.no_motion_timeout.register();
      }
    } catch (err) {
      this.homey.app.log('Flow card no_motion_timeout not available yet');
    }

    // THEN: Enable/disable motion sensor
    try {
      this.actions.enable_motion_sensor = this.homey.flow.getDeviceActionCard('enable_motion_sensor');
      if (this.actions.enable_motion_sensor) {
        this.actions.enable_motion_sensor.registerRunListener(async (args) => {
          await args.device.setCapabilityValue('alarm_motion_enabled', args.enabled);
          return true;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card enable_motion_sensor not available yet');
    }

    // AND: Motion detected in last X minutes
    try {
      this.conditions.motion_in_last_minutes = this.homey.flow.getDeviceConditionCard('motion_in_last_minutes');
      if (this.conditions.motion_in_last_minutes) {
        this.conditions.motion_in_last_minutes.registerRunListener(async (args) => {
          const lastMotion = args.device.getStoreValue('last_motion_time') || 0;
          const minutesAgo = (Date.now() - lastMotion) / 60000;
          return minutesAgo <= args.minutes;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card motion_in_last_minutes not available yet');
    }
  }

  /**
   * SMART PLUG FLOW CARDS
   */
  registerSmartPlugCards() {
    // WHEN: Power above threshold
    try {
      this.triggers.power_above_threshold = this.homey.flow.getDeviceTriggerCard('power_above_threshold');
      if (this.triggers.power_above_threshold) {
        this.triggers.power_above_threshold.registerRunListener(async (args, state) => {
          return state.power > args.watts;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card power_above_threshold not available yet');
    }

    // THEN: Reset energy meter
    try {
      this.actions.reset_energy_meter = this.homey.flow.getDeviceActionCard('reset_energy_meter');
      if (this.actions.reset_energy_meter) {
        this.actions.reset_energy_meter.registerRunListener(async (args) => {
          await args.device.setStoreValue('energy_start', Date.now());
          await args.device.setCapabilityValue('meter_power', 0);
          return true;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card reset_energy_meter not available yet');
    }

    // AND: Power consumption in range
    try {
      this.conditions.power_in_range = this.homey.flow.getDeviceConditionCard('power_in_range');
      if (this.conditions.power_in_range) {
        this.conditions.power_in_range.registerRunListener(async (args) => {
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power >= args.min_watts && power <= args.max_watts;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card power_in_range not available yet');
    }
  }

  /**
   * BUTTON FLOW CARDS
   */
  registerButtonCards() {
    // WHEN: Button pressed X times
    try {
      this.triggers.button_pressed_times = this.homey.flow.getDeviceTriggerCard('button_pressed_times');
      if (this.triggers.button_pressed_times) {
        this.triggers.button_pressed_times.registerRunListener(async (args, state) => {
          return state.presses === args.times;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card button_pressed_times not available yet');
    }

    // WHEN: Button long press
    try {
      this.triggers.button_long_press = this.homey.flow.getDeviceTriggerCard('button_long_press');
      if (this.triggers.button_long_press) {
        this.triggers.button_long_press.registerRunListener(async (args, state) => {
          return state.duration >= args.seconds;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card button_long_press not available yet');
    }
  }

  /**
   * TEMPERATURE SENSOR FLOW CARDS
   */
  registerTemperatureSensorCards() {
    // WHEN: Temperature crossed threshold
    try {
      this.triggers.temperature_crossed = this.homey.flow.getDeviceTriggerCard('temperature_crossed_threshold');
      if (this.triggers.temperature_crossed) {
        this.triggers.temperature_crossed.registerRunListener(async (args, state) => {
          if (args.direction === 'rising') {
            return state.oldTemp < args.threshold && state.newTemp >= args.threshold;
          } else {
            return state.oldTemp > args.threshold && state.newTemp <= args.threshold;
          }
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card temperature_crossed_threshold not available yet');
    }

    // AND: Temperature in range
    try {
      this.conditions.temp_in_range = this.homey.flow.getDeviceConditionCard('temperature_in_range');
      if (this.conditions.temp_in_range) {
        this.conditions.temp_in_range.registerRunListener(async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp >= args.min_temp && temp <= args.max_temp;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card temperature_in_range not available yet');
    }
  }

  /**
   * DEVICE HEALTH FLOW CARDS
   */
  registerDeviceHealthCards() {
    // WHEN: Device went offline
    try {
      this.triggers.device_offline = this.homey.flow.getDeviceTriggerCard('device_offline');
      if (this.triggers.device_offline) {
        this.triggers.device_offline.register();
      }
    } catch (err) {
      this.homey.app.log('Flow card device_offline not available yet');
    }

    // AND: Device is reachable
    try {
      this.conditions.device_reachable = this.homey.flow.getDeviceConditionCard('device_reachable');
      if (this.conditions.device_reachable) {
        this.conditions.device_reachable.registerRunListener(async (args) => {
          const offline = args.device.getCapabilityValue('alarm_offline') || false;
          return !offline;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card device_reachable not available yet');
    }
  }
}

module.exports = FlowCardManager;
