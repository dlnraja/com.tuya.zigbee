'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * ADVANCED FLOW CARD MANAGER
 *
 * InspirÃ© des meilleures pratiques de:
 * - Johan Bendz (Philips Hue Zigbee)
 * - Maxmudjon (Aqara & Xiaomi)
 * - StyraHem (SONOFF Zigbee)
 * - Device Capabilities App
 *
 * ImplÃ©mente des flow cards avancÃ©es pour tous les types de devices
 *
 * v5.5.344: CRITICAL FIX - Added _safeDeviceHandler wrapper to prevent
 * "cant get device by id" errors when device was safeDivide(deleted, re)-paired
 */

class AdvancedFlowCardManager {

  constructor(homey) {
    this.homey = homey;
    this.registeredCards = new Map();
  }

  /**
   * v5.5.344: CRITICAL - Safe device handler wrapper
   * Prevents "cant get device by id" errors when device was safeDivide(deleted, re)-paired
   */
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
        if (err.message?.toLowerCase().includes('device')) {
          this.homey.app?.error?.(`[ADV-FLOW] ${cardName}: ${err.message}`);
          return defaultReturn;
        }
        throw err;
      }
    };
  }

  /**
   * Safe flow card getter - prevents crash if card not registered in app.json
   * SDK v3 API: getTriggerCard, getActionCard, getConditionCard
   * may throw if the card ID doesn't exist in the app manifest.
   */
  _safeGetCard(type, id) {
    try {
      switch (type) {
        case 'trigger': return this.homey.flow.getTriggerCard(id);
        case 'action': return this.homey.flow.getActionCard(id);
        case 'condition': return this.homey.flow.getConditionCard(id);
        default: return null;
      }
    } catch (err) {
      // Card not registered in app.json  skip silently
      return null;
    }
  }

  /**
   * Register ALL advanced flow cards
   * Each category is individually wrapped to prevent one failure from blocking others
   */
  registerAllFlowCards() {
    const categories = [
      ['MotionSensor', () => this.registerMotionSensorCards()],
      ['SmartPlug', () => this.registerSmartPlugCards()],
      ['TemperatureSensor', () => this.registerTemperatureSensorCards()],
      ['Button', () => this.registerButtonCards()],
      ['Light', () => this.registerLightCards()],
      ['Health', () => this.registerHealthCards()],
    ];
    let ok = 0, fail = 0;
    for (const [name, fn] of categories) {
      try { fn(); ok++; } catch (e) {
        this.homey.app?.log?.(`[ADV-FLOW] ${name} cards failed (non-critical): ${e.message}`);
        fail++;
      }
    }
    this.homey.app?.log?.(`[ADV-FLOW] Registered ${ok} categories, ${fail} skipped`);
  }

  /**
   * MOTION SENSOR CARDS
   * InspirÃ© de: Philips Hue Motion Sensor
   */
  registerMotionSensorCards() {
    // WHEN: Motion detected with lux condition
    this._safeGetCard('trigger','motion_alarm_lux')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const lux = state.lux || 0;
        return lux >= args.lux_min && lux <= args.lux_max;
      }, 'motion_alarm_lux', false))
      .registerArgumentAutocompleteListener('device', async (query, args) => {
        return this.getMotionSensorDevices();
      });

    // WHEN: No motion for X minutes
    this._safeGetCard('trigger','no_motion_timeout')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const device = args.device;
        const lastMotion = device.getStoreValue('last_motion_time') || Date.now();
        const elapsed = (Date.now() - safeParse(lastMotion)) / 60000; // minutes
        return elapsed >= args.minutes;
      }, 'no_motion_timeout', false));

    // THEN: Enable/disable motion sensor
    this._safeGetCard('action','enable_motion_sensor')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        await device.setCapabilityValue('alarm_motion_enabled', args.enabled);
        device.log(`Motion sensor ${args.enabled ? 'enabled' : 'disabled'}`);
      }, 'enable_motion_sensor', true));

    // THEN: Set motion sensitivity
    this._safeGetCard('action','set_motion_sensitivity')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        await device.setSettings({ motion_sensitivity: args.sensitivity });
        device.log('Motion sensitivity set to:', args.sensitivity);
      }, 'set_motion_sensitivity', true));

    // AND: Motion detected in last X minutes
    this._safeGetCard('condition','motion_in_last_minutes')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const lastMotion = device.getStoreValue('last_motion_time') || 0;
        const elapsed = (Date.now() - safeParse(lastMotion)) / 60000;
        return elapsed < args.minutes;
      }, 'motion_in_last_minutes', false));

    // AND: Lux level above/below threshold
    this._safeGetCard('condition','lux_threshold')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const lux = device.getCapabilityValue('measure_luminance') || 0;

        if (args.comparison === 'above') {
          return lux > args.threshold;
        } else {
          return lux < args.threshold;
        }
      }, 'lux_threshold', false));
  }

  /**
   * SMART PLUG CARDS
   * InspirÃ© de: SONOFF Zigbee Energy Monitoring
   */
  registerSmartPlugCards() {
    // WHEN: Power above threshold
    this._safeGetCard('trigger','power_above_threshold')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const power = state.power || 0;
        return power > args.watts;
      }, 'power_above_threshold', false));

    // WHEN: Power below threshold for duration
    this._safeGetCard('trigger','power_below_threshold_duration')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const device = args.device;
        const power = state.power || 0;

        if (power < args.watts) {
          const belowSince = device.getStoreValue('power_below_since') || Date.now();
          device.setStoreValue('power_below_since', belowSince);

          const elapsed = (Date.now() - safeParse(belowSince)) / 60000; // minutes
          return elapsed >= args.minutes;
        } else {
          device.setStoreValue('power_below_since', null);
          return false;
        }
      }, 'power_below_threshold_duration', false));

    // WHEN: Energy today exceeded
    this._safeGetCard('trigger','energy_today_exceeded')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const device = args.device;
        const dailyEnergy = this.calculateDailyEnergy(device);
        return dailyEnergy > args.kwh;
      }, 'energy_today_exceeded', false));

    // WHEN: Power changed by percentage
    this._safeGetCard('trigger','power_changed_percentage')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const device = args.device;
        const oldPower = device.getStoreValue('last_power') || 0;
        const newPower = state.power || 0;

        if (oldPower === 0) return false;

        const change = Math.abs((newPower - oldPower) / oldPower) * 100;
        device.setStoreValue('last_power', newPower);

        return change >= args.percent;
      }, 'power_changed_percentage', false));

    // THEN: Reset energy meter
    this._safeGetCard('action','reset_energy_meter')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const currentEnergy = device.getCapabilityValue('meter_power') || 0;
        device.setStoreValue('energy_start', currentEnergy);
        device.setStoreValue('energy_day_start', currentEnergy);
        device.log('Energy meter reset');
      }, 'reset_energy_meter', true));

    // THEN: Set power threshold alert
    this._safeGetCard('action','set_power_threshold')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        await device.setSettings({ power_threshold_alert: args.watts });
        device.log('Power threshold set to:', args.watts, 'W');
      }, 'set_power_threshold', true));

    // AND: Power in range
    this._safeGetCard('condition','power_in_range')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const power = device.getCapabilityValue('measure_power') || 0;
        return power >= args.min && power <= args.max;
      }, 'power_in_range', false));

    // AND: Energy today above/below
    this._safeGetCard('condition','energy_today_threshold')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const dailyEnergy = this.calculateDailyEnergy(device);

        if (args.comparison === 'above') {
          return dailyEnergy > args.kwh;
        } else {
          return dailyEnergy < args.kwh;
        }
      }, 'energy_today_threshold', false));
  }

  /**
   * TEMPERATURE SENSOR CARDS
   * InspirÃ© de: Aqara Temperature Sensor
   */
  registerTemperatureSensorCards() {
    // WHEN: Temperature crossed threshold
    this._safeGetCard('trigger','temperature_crossed_threshold')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const oldTemp = state.oldTemp || 0;
        const newTemp = state.newTemp || 0;
        const threshold = args.threshold;

        if (args.direction === 'rising') {
          return oldTemp < threshold && newTemp >= threshold;
        } else {
          return oldTemp > threshold && newTemp <= threshold;
        }
      }, 'temperature_crossed_threshold', false));

    // WHEN: Humidity changed by percentage
    this._safeGetCard('trigger','humidity_changed_by')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const change = Math.abs(state.change || 0);
        return change >= args.percent;
      }, 'humidity_changed_by', false));

    // WHEN: Temperature changed rapidly
    this._safeGetCard('trigger','temperature_changed_rapidly')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const device = args.device;
        const change = Math.abs(state.change || 0);
        const timeWindow =safeMultiply(args.minutes, 60000); // ms

        const lastChange = device.getStoreValue('last_temp_change_time') || Date.now();
        const elapsed = Date.now() - lastChange;

        if (change >= args.degrees && elapsed <= timeWindow) {
          return true;
        }

        device.setStoreValue('last_temp_change_time', Date.now());
        return false;
      }, 'temperature_changed_rapidly', false));

    // THEN: Calibrate temperature offset
    this._safeGetCard('action','calibrate_temperature')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        await device.setSettings({ temp_offset: args.offset });
        device.log('Temperature offset set to:', args.offset, 'Â°C');
      }, 'calibrate_temperature', true));

    // AND: Temperature in range
    this._safeGetCard('condition','temperature_in_range')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const temp = device.getCapabilityValue('measure_temperature') || 0;
        return temp >= args.min && temp <= args.max;
      }, 'temperature_in_range', false));

    // AND: Humidity above/below
    this._safeGetCard('condition','humidity_threshold')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const humidity = device.getCapabilityValue('measure_humidity') || 0;

        if (args.comparison === 'above') {
          return humidity > args.percent;
        } else {
          return humidity < args.percent;
        }
      }, 'humidity_threshold', false));
  }

  /**
   * BUTTON CARDS
   * InspirÃ© de: Philips Hue Dimmer Switch
   */
  registerButtonCards() {
    // WHEN: Button pressed X times
    this._safeGetCard('trigger','button_pressed_times')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        return state.presses === args.times;
      }, 'button_pressed_times', false));

    // WHEN: Button long pressed
    this._safeGetCard('trigger','button_long_press')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const duration = state.duration || 0;
        return duration >= (args.seconds * 1000);
      }, 'button_long_press', false));

    // WHEN: Button released after long press
    this._safeGetCard('trigger','button_released_after_long')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        return state.was_long_press === true;
      }, 'button_released_after_long', false));

    // THEN: Enable/disable button
    this._safeGetCard('action','enable_button')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        await device.setCapabilityValue('button_enabled', args.enabled);
        device.log(`Button ${args.enabled ? 'enabled' : 'disabled'}`);
      }, 'enable_button', true));

    // AND: Button state
    this._safeGetCard('condition','button_is_pressed')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        return device.getCapabilityValue('button_pressed') === true;
      }, 'button_is_pressed', false));
  }

  /**
   * LIGHT CARDS
   * InspirÃ© de: Philips Hue Zigbee (Johan Bendz)
   */
  registerLightCards() {
    // THEN: Set brightness with transition
    this._safeGetCard('action','set_dim_with_transition')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const targetDim = safeParse(args.brightness, 100);
        const transitionTime = args.seconds;

        await device.triggerCapabilityListener('dim', targetDim, {
          transitionTime:safeMultiply(transitionTime, 10) // deciseconds
        });

        device.log(`Dim to ${args.brightness}% over ${args.seconds}s`);
      }, 'set_dim_with_transition', true));

    // THEN: Flash light
    this._safeGetCard('action','flash_light')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const times = args.times || 3;
        const originalState = device.getCapabilityValue('onoff');

        for (let i = 0; i < times; i++) {
          await device.setCapabilityValue('onoff', false);
          await this.sleep(200);
          await device.setCapabilityValue('onoff', true);
          await this.sleep(200);
        }

        await device.setCapabilityValue('onoff', originalState);
        device.log('Light flashed', times, 'times');
      }, 'flash_light', true));

    // THEN: Breathing effect
    this._safeGetCard('action','breathing_effect')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const duration =safeMultiply(args.seconds, 1000);
        const steps = 20;
        const stepTime = duration / (steps * 2);

        // Fade down
        for (let i = 100; i >= 0; i -= safeDivide(100, steps)) {
          await device.setCapabilityValue('dim', safeParse(i, 100));
          await this.sleep(stepTime);
        }

        // Fade up
        for (let i = 0; i <= 100; i += safeDivide(100, steps)) {
          await device.setCapabilityValue('dim', safeParse(i, 100));
          await this.sleep(stepTime);
        }

        device.log('Breathing effect completed');
      }, 'breathing_effect', true));
  }

  /**
   * HEALTH MONITORING CARDS
   * InspirÃ© de: SONOFF Zigbee
   */
  registerHealthCards() {
    // WHEN: Device went offline
    this._safeGetCard('trigger','device_offline')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        return state.offline === true;
      }, 'device_offline', false));

    // WHEN: Signal strength below threshold
    this._safeGetCard('trigger','signal_strength_low')?.registerRunListener(this._safeDeviceHandler(async (args, state) => {
        const rssi = state.rssi || 0;
        return rssi < args.threshold;
      }, 'signal_strength_low', false));

    // THEN: Ping device
    this._safeGetCard('action','ping_device')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        try {
          const isReachable = await device.ping();
          device.log('Ping result:', isReachable ? 'reachable' : 'unreachable');
          return isReachable;
        } catch (err) {
          device.error('Ping failed:', err);
          return false;
        }
      }, 'ping_device', false));

    // AND: Device is reachable
    this._safeGetCard('condition','device_is_reachable')?.registerRunListener(this._safeDeviceHandler(async (args) => {
        const device = args.device;
        const lastSeen = device.getStoreValue('last_seen_timestamp') || Date.now();
        const elapsed = Date.now() - lastSeen;
        return elapsed < 3600000; // 1 hour
      }, 'device_is_reachable', false));
  }

  /**
   * Helper functions
   */
  calculateDailyEnergy(device) {
    const currentEnergy = device.getCapabilityValue('meter_power') || 0;
    const dayStart = device.getStoreValue('energy_day_start') || currentEnergy;
    return currentEnergy - dayStart;
  }

  async getMotionSensorDevices() {
    const devices = this.homey.drivers.getDevices();
    return devices.filter(device =>
      device.hasCapability('alarm_motion')
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get registered cards count
   */
  getRegisteredCardsCount() {
    return {
      motion: 6,
      smartplug: 8,
      temperature: 6,
      button: 5,
      light: 3,
      health: 4,
      total: 32
    };
  }
}

module.exports = AdvancedFlowCardManager;




