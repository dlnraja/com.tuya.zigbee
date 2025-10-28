'use strict';

/**
 * ADVANCED FLOW CARD MANAGER
 * 
 * Inspiré des meilleures pratiques de:
 * - Johan Bendz (Philips Hue Zigbee)
 * - Maxmudjon (Aqara & Xiaomi)
 * - StyraHem (SONOFF Zigbee)
 * - Device Capabilities App
 * 
 * Implémente des flow cards avancées pour tous les types de devices
 */

class AdvancedFlowCardManager {

  constructor(homey) {
    this.homey = homey;
    this.registeredCards = new Map();
  }

  /**
   * Register ALL advanced flow cards
   */
  registerAllFlowCards() {
    this.registerMotionSensorCards();
    this.registerSmartPlugCards();
    this.registerTemperatureSensorCards();
    this.registerButtonCards();
    this.registerLightCards();
    this.registerHealthCards();
  }

  /**
   * MOTION SENSOR CARDS
   * Inspiré de: Philips Hue Motion Sensor
   */
  registerMotionSensorCards() {
    // WHEN: Motion detected with lux condition
    this.homey.flow.getDeviceTriggerCard('motion_alarm_lux')
      .registerRunListener(async (args, state) => {
        const lux = state.lux || 0;
        return lux >= args.lux_min && lux <= args.lux_max;
      })
      .registerArgumentAutocompleteListener('device', async (query, args) => {
        return this.getMotionSensorDevices();
      });

    // WHEN: No motion for X minutes
    this.homey.flow.getDeviceTriggerCard('no_motion_timeout')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        const lastMotion = device.getStoreValue('last_motion_time') || Date.now();
        const elapsed = (Date.now() - lastMotion) / 60000; // minutes
        return elapsed >= args.minutes;
      });

    // THEN: Enable/disable motion sensor
    this.homey.flow.getDeviceActionCard('enable_motion_sensor')
      .registerRunListener(async (args) => {
        const device = args.device;
        await device.setCapabilityValue('alarm_motion_enabled', args.enabled);
        device.log(`Motion sensor ${args.enabled ? 'enabled' : 'disabled'}`);
      });

    // THEN: Set motion sensitivity
    this.homey.flow.getDeviceActionCard('set_motion_sensitivity')
      .registerRunListener(async (args) => {
        const device = args.device;
        await device.setSettings({ motion_sensitivity: args.sensitivity });
        device.log('Motion sensitivity set to:', args.sensitivity);
      });

    // AND: Motion detected in last X minutes
    this.homey.flow.getDeviceConditionCard('motion_in_last_minutes')
      .registerRunListener(async (args) => {
        const device = args.device;
        const lastMotion = device.getStoreValue('last_motion_time') || 0;
        const elapsed = (Date.now() - lastMotion) / 60000;
        return elapsed < args.minutes;
      });

    // AND: Lux level above/below threshold
    this.homey.flow.getDeviceConditionCard('lux_threshold')
      .registerRunListener(async (args) => {
        const device = args.device;
        const lux = device.getCapabilityValue('measure_luminance') || 0;
        
        if (args.comparison === 'above') {
          return lux > args.threshold;
        } else {
          return lux < args.threshold;
        }
      });
  }

  /**
   * SMART PLUG CARDS
   * Inspiré de: SONOFF Zigbee Energy Monitoring
   */
  registerSmartPlugCards() {
    // WHEN: Power above threshold
    this.homey.flow.getDeviceTriggerCard('power_above_threshold')
      .registerRunListener(async (args, state) => {
        const power = state.power || 0;
        return power > args.watts;
      });

    // WHEN: Power below threshold for duration
    this.homey.flow.getDeviceTriggerCard('power_below_threshold_duration')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        const power = state.power || 0;
        
        if (power < args.watts) {
          const belowSince = device.getStoreValue('power_below_since') || Date.now();
          device.setStoreValue('power_below_since', belowSince);
          
          const elapsed = (Date.now() - belowSince) / 60000; // minutes
          return elapsed >= args.minutes;
        } else {
          device.setStoreValue('power_below_since', null);
          return false;
        }
      });

    // WHEN: Energy today exceeded
    this.homey.flow.getDeviceTriggerCard('energy_today_exceeded')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        const dailyEnergy = this.calculateDailyEnergy(device);
        return dailyEnergy > args.kwh;
      });

    // WHEN: Power changed by percentage
    this.homey.flow.getDeviceTriggerCard('power_changed_percentage')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        const oldPower = device.getStoreValue('last_power') || 0;
        const newPower = state.power || 0;
        
        if (oldPower === 0) return false;
        
        const change = Math.abs((newPower - oldPower) / oldPower * 100);
        device.setStoreValue('last_power', newPower);
        
        return change >= args.percent;
      });

    // THEN: Reset energy meter
    this.homey.flow.getDeviceActionCard('reset_energy_meter')
      .registerRunListener(async (args) => {
        const device = args.device;
        const currentEnergy = device.getCapabilityValue('meter_power') || 0;
        device.setStoreValue('energy_start', currentEnergy);
        device.setStoreValue('energy_day_start', currentEnergy);
        device.log('Energy meter reset');
      });

    // THEN: Set power threshold alert
    this.homey.flow.getDeviceActionCard('set_power_threshold')
      .registerRunListener(async (args) => {
        const device = args.device;
        await device.setSettings({ power_threshold_alert: args.watts });
        device.log('Power threshold set to:', args.watts, 'W');
      });

    // AND: Power in range
    this.homey.flow.getDeviceConditionCard('power_in_range')
      .registerRunListener(async (args) => {
        const device = args.device;
        const power = device.getCapabilityValue('measure_power') || 0;
        return power >= args.min && power <= args.max;
      });

    // AND: Energy today above/below
    this.homey.flow.getDeviceConditionCard('energy_today_threshold')
      .registerRunListener(async (args) => {
        const device = args.device;
        const dailyEnergy = this.calculateDailyEnergy(device);
        
        if (args.comparison === 'above') {
          return dailyEnergy > args.kwh;
        } else {
          return dailyEnergy < args.kwh;
        }
      });
  }

  /**
   * TEMPERATURE SENSOR CARDS
   * Inspiré de: Aqara Temperature Sensor
   */
  registerTemperatureSensorCards() {
    // WHEN: Temperature crossed threshold
    this.homey.flow.getDeviceTriggerCard('temperature_crossed_threshold')
      .registerRunListener(async (args, state) => {
        const oldTemp = state.oldTemp || 0;
        const newTemp = state.newTemp || 0;
        const threshold = args.threshold;
        
        if (args.direction === 'rising') {
          return oldTemp < threshold && newTemp >= threshold;
        } else {
          return oldTemp > threshold && newTemp <= threshold;
        }
      });

    // WHEN: Humidity changed by percentage
    this.homey.flow.getDeviceTriggerCard('humidity_changed_by')
      .registerRunListener(async (args, state) => {
        const change = Math.abs(state.change || 0);
        return change >= args.percent;
      });

    // WHEN: Temperature changed rapidly
    this.homey.flow.getDeviceTriggerCard('temperature_changed_rapidly')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        const change = Math.abs(state.change || 0);
        const timeWindow = args.minutes * 60000; // ms
        
        const lastChange = device.getStoreValue('last_temp_change_time') || Date.now();
        const elapsed = Date.now() - lastChange;
        
        if (change >= args.degrees && elapsed <= timeWindow) {
          return true;
        }
        
        device.setStoreValue('last_temp_change_time', Date.now());
        return false;
      });

    // THEN: Calibrate temperature offset
    this.homey.flow.getDeviceActionCard('calibrate_temperature')
      .registerRunListener(async (args) => {
        const device = args.device;
        await device.setSettings({ temp_offset: args.offset });
        device.log('Temperature offset set to:', args.offset, '°C');
      });

    // AND: Temperature in range
    this.homey.flow.getDeviceConditionCard('temperature_in_range')
      .registerRunListener(async (args) => {
        const device = args.device;
        const temp = device.getCapabilityValue('measure_temperature') || 0;
        return temp >= args.min && temp <= args.max;
      });

    // AND: Humidity above/below
    this.homey.flow.getDeviceConditionCard('humidity_threshold')
      .registerRunListener(async (args) => {
        const device = args.device;
        const humidity = device.getCapabilityValue('measure_humidity') || 0;
        
        if (args.comparison === 'above') {
          return humidity > args.percent;
        } else {
          return humidity < args.percent;
        }
      });
  }

  /**
   * BUTTON CARDS
   * Inspiré de: Philips Hue Dimmer Switch
   */
  registerButtonCards() {
    // WHEN: Button pressed X times
    this.homey.flow.getDeviceTriggerCard('button_pressed_times')
      .registerRunListener(async (args, state) => {
        return state.presses === args.times;
      });

    // WHEN: Button long pressed
    this.homey.flow.getDeviceTriggerCard('button_long_press')
      .registerRunListener(async (args, state) => {
        const duration = state.duration || 0;
        return duration >= (args.seconds * 1000);
      });

    // WHEN: Button released after long press
    this.homey.flow.getDeviceTriggerCard('button_released_after_long')
      .registerRunListener(async (args, state) => {
        return state.was_long_press === true;
      });

    // THEN: Enable/disable button
    this.homey.flow.getDeviceActionCard('enable_button')
      .registerRunListener(async (args) => {
        const device = args.device;
        await device.setCapabilityValue('button_enabled', args.enabled);
        device.log(`Button ${args.enabled ? 'enabled' : 'disabled'}`);
      });

    // AND: Button state
    this.homey.flow.getDeviceConditionCard('button_is_pressed')
      .registerRunListener(async (args) => {
        const device = args.device;
        return device.getCapabilityValue('button_pressed') === true;
      });
  }

  /**
   * LIGHT CARDS
   * Inspiré de: Philips Hue Zigbee (Johan Bendz)
   */
  registerLightCards() {
    // THEN: Set brightness with transition
    this.homey.flow.getDeviceActionCard('set_dim_with_transition')
      .registerRunListener(async (args) => {
        const device = args.device;
        const targetDim = args.brightness / 100;
        const transitionTime = args.seconds;
        
        await device.triggerCapabilityListener('dim', targetDim, {
          transitionTime: transitionTime * 10 // deciseconds
        });
        
        device.log(`Dim to ${args.brightness}% over ${args.seconds}s`);
      });

    // THEN: Flash light
    this.homey.flow.getDeviceActionCard('flash_light')
      .registerRunListener(async (args) => {
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
      });

    // THEN: Breathing effect
    this.homey.flow.getDeviceActionCard('breathing_effect')
      .registerRunListener(async (args) => {
        const device = args.device;
        const duration = args.seconds * 1000;
        const steps = 20;
        const stepTime = duration / (steps * 2);
        
        // Fade down
        for (let i = 100; i >= 0; i -= 100/steps) {
          await device.setCapabilityValue('dim', i / 100);
          await this.sleep(stepTime);
        }
        
        // Fade up
        for (let i = 0; i <= 100; i += 100/steps) {
          await device.setCapabilityValue('dim', i / 100);
          await this.sleep(stepTime);
        }
        
        device.log('Breathing effect completed');
      });
  }

  /**
   * HEALTH MONITORING CARDS
   * Inspiré de: SONOFF Zigbee
   */
  registerHealthCards() {
    // WHEN: Device went offline
    this.homey.flow.getDeviceTriggerCard('device_offline')
      .registerRunListener(async (args, state) => {
        return state.offline === true;
      });

    // WHEN: Signal strength below threshold
    this.homey.flow.getDeviceTriggerCard('signal_strength_low')
      .registerRunListener(async (args, state) => {
        const rssi = state.rssi || 0;
        return rssi < args.threshold;
      });

    // THEN: Ping device
    this.homey.flow.getDeviceActionCard('ping_device')
      .registerRunListener(async (args) => {
        const device = args.device;
        try {
          const isReachable = await device.ping();
          device.log('Ping result:', isReachable ? 'reachable' : 'unreachable');
          return isReachable;
        } catch (err) {
          device.error('Ping failed:', err);
          return false;
        }
      });

    // AND: Device is reachable
    this.homey.flow.getDeviceConditionCard('device_is_reachable')
      .registerRunListener(async (args) => {
        const device = args.device;
        const lastSeen = device.getStoreValue('last_seen_timestamp') || Date.now();
        const elapsed = Date.now() - lastSeen;
        return elapsed < 3600000; // 1 hour
      });
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
