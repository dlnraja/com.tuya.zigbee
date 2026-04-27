'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * ADVANCED FLOW CARD MANAGER
 */
class AdvancedFlowCardManager {
  constructor(homey) {
    this.homey = homey;
    this.registeredCards = new Map();
  }

  _safeDeviceHandler(handler, cardName, defaultReturn = false) {
    return async (args, state) => {
      try {
        if (!args || !args.device) {
          this.homey.app?.error?.(`[ADV-FLOW] ${cardName}: No device in args`);
          return defaultReturn;
        }
        if (typeof args.device.getCapabilityValue !== 'function') {
          this.homey.app?.error?.(`[ADV-FLOW] ${cardName}: Invalid device reference`);
          return defaultReturn;
        }
        return await handler(args, state);
      } catch (err) {
        this.homey.app?.error?.(`[ADV-FLOW] ${cardName}: ${err.message}`);
        return defaultReturn;
      }
    };
  }

  _safeGetCard(type, id) {
    try {
      switch (type) {
        case 'trigger': return this.homey.flow.getTriggerCard(id);
        case 'action': return this.homey.flow.getActionCard(id);
        case 'condition': return this.homey.flow.getConditionCard(id);
        default: return null;
      }
    } catch (err) {
      return null;
    }
  }

  registerAllFlowCards() {
    const categories = [
      ['MotionSensor', () => this.registerMotionSensorCards()],
      ['SmartPlug', () => this.registerSmartPlugCards()],
      ['TemperatureSensor', () => this.registerTemperatureSensorCards()],
      ['Button', () => this.registerButtonCards()],
      ['Light', () => this.registerLightCards()],
      ['Health', () => this.registerHealthCards()],
    ];
    for (const [name, fn] of categories) {
      try { fn(); } catch (e) {
        this.homey.app?.log?.(`[ADV-FLOW] ${name} cards failed: ${e.message}`);
      }
    }
  }

  registerMotionSensorCards() {
    this._safeGetCard('trigger', 'motion_alarm_lux')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
      const lux = state.lux || 0;
      return lux >= args.lux_min && lux <= args.lux_max;
    }, 'motion_alarm_lux', false));

    this._safeGetCard('trigger', 'no_motion_timeout')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
      const lastMotion = args.device.getStoreValue('last_motion_time') || Date.now();
      const elapsed = (Date.now() - safeParse(lastMotion)) / 60000;
      return elapsed >= args.minutes;
    }, 'no_motion_timeout', false));

    this._safeGetCard('action', 'enable_motion_sensor')?.registerRunListener(this._safeDeviceHandler(async (args) => {
      await args.device.setCapabilityValue('alarm_motion_enabled', args.enabled);
    }, 'enable_motion_sensor', true));

    this._safeGetCard('condition', 'motion_in_last_minutes')?.registerRunListener(this._safeDeviceHandler(async (args) => {
      const lastMotion = args.device.getStoreValue('last_motion_time') || 0;
      const elapsed = (Date.now() - safeParse(lastMotion)) / 60000;
      return elapsed < args.minutes;
    }, 'motion_in_last_minutes', false));
  }

  registerSmartPlugCards() {
    this._safeGetCard('trigger', 'power_above_threshold')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
      return (state.power || 0) > args.watts;
    }, 'power_above_threshold', false));

    this._safeGetCard('trigger', 'power_changed_percentage')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
      const oldPower = args.device.getStoreValue('last_power') || 0;
      const newPower = state.power || 0;
      if (oldPower === 0) return false;
      const change = Math.abs((newPower - oldPower) / oldPower) * 100;
      args.device.setStoreValue('last_power', newPower);
      return change >= args.percent;
    }, 'power_changed_percentage', false));

    this._safeGetCard('action', 'reset_energy_meter')?.registerRunListener(this._safeDeviceHandler(async (args) => {
      const currentEnergy = args.device.getCapabilityValue('meter_power') || 0;
      args.device.setStoreValue('energy_start', currentEnergy);
      args.device.setStoreValue('energy_day_start', currentEnergy);
    }, 'reset_energy_meter', true));
  }

  registerTemperatureSensorCards() {
    this._safeGetCard('trigger', 'temperature_crossed_threshold')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
      const oldTemp = state.oldTemp || 0;
      const newTemp = state.newTemp || 0;
      const threshold = args.threshold;
      return args.direction === 'rising' ? (oldTemp < threshold && newTemp >= threshold) : (oldTemp > threshold && newTemp <= threshold);
    }, 'temperature_crossed_threshold', false));
  }

  registerButtonCards() {
    this._safeGetCard('trigger', 'button_pressed_times')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
      return state.presses === args.times;
    }, 'button_pressed_times', false));
  }

  registerLightCards() {
    this._safeGetCard('action', 'set_dim_with_transition')?.registerRunListener(this._safeDeviceHandler(async (args) => {
      await args.device.triggerCapabilityListener('dim', safeParse(args.brightness, 100), {
        transitionTime: safeMultiply(args.seconds, 10)
      });
    }, 'set_dim_with_transition', true));
  }

  registerHealthCards() {
    this._safeGetCard('trigger', 'device_offline')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
      return state.offline === true;
    }, 'device_offline', false));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AdvancedFlowCardManager;
