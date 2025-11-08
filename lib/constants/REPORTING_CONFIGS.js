'use strict';

/**
 * Optimized Attribute Reporting Configurations
 * Based on best practices from IKEA Trådfri, Philips Hue, and Athom official docs
 * 
 * @see https://github.com/athombv/com.ikea.tradfri-example
 * @see https://github.com/JohanBendz/com.philips.hue.zigbee
 * @see https://athombv.github.io/node-homey-zigbeedriver/
 */

module.exports = {
  /**
   * Battery reporting - Optimized for battery-powered devices
   * - Report immediately on change (minInterval: 0)
   * - At least once per hour (maxInterval: 3600)
   * - Only if value changes by 5% (minChange: 5)
   */
  battery: {
    minInterval: 0,       // Report immediately if changed
    maxInterval: 3600,    // At least hourly (1 hour)
    minChange: 5,         // Report on 5% change
  },

  /**
   * Battery voltage - For devices reporting raw voltage
   * - Similar to battery but more sensitive
   * - maxInterval longer (6 hours) to save battery
   */
  batteryVoltage: {
    minInterval: 0,
    maxInterval: 21600,   // Every 6 hours
    minChange: 100,       // 0.1V (value in mV)
  },

  /**
   * Temperature - Optimized for temperature sensors
   * - Not more than once per minute (minInterval: 60)
   * - At least every 5 minutes (maxInterval: 300)
   * - Only if temp changes by 0.5°C (minChange: 50, value * 100)
   */
  temperature: {
    minInterval: 60,      // Max once per minute
    maxInterval: 300,     // At least every 5 minutes
    minChange: 50,        // 0.5°C (temperature * 100)
  },

  /**
   * Humidity - Similar to temperature
   * - Not more than once per minute
   * - At least every 5 minutes
   * - Only if humidity changes by 1% (minChange: 100, value * 100)
   */
  humidity: {
    minInterval: 60,
    maxInterval: 300,
    minChange: 100,       // 1% (humidity * 100)
  },

  /**
   * Pressure - For barometric pressure sensors
   * - Less frequent reporting (every 10 minutes)
   * - Only on significant changes (1 hPa)
   */
  pressure: {
    minInterval: 300,     // Max once per 5 minutes
    maxInterval: 600,     // At least every 10 minutes
    minChange: 10,        // 1 hPa (pressure * 10)
  },

  /**
   * Power (measure_power) - For active power monitoring
   * - Frequent reporting (every 10 seconds max)
   * - At least every 5 minutes
   * - Report on 1W change
   */
  power: {
    minInterval: 10,      // Max once per 10 seconds
    maxInterval: 300,     // At least every 5 minutes
    minChange: 1,         // 1W change
  },

  /**
   * Voltage - For mains voltage monitoring
   * - Less frequent (stable power)
   * - Report on 5V change
   */
  voltage: {
    minInterval: 60,      // Max once per minute
    maxInterval: 600,     // At least every 10 minutes
    minChange: 5,         // 5V change
  },

  /**
   * Current - For current monitoring
   * - Frequent for safety
   * - Report on 100mA change
   */
  current: {
    minInterval: 10,
    maxInterval: 300,
    minChange: 100,       // 100mA (current in mA)
  },

  /**
   * Energy (meter_power) - Cumulative energy
   * - Less frequent (cumulative value)
   * - Report on 10Wh change
   */
  energy: {
    minInterval: 300,     // Max once per 5 minutes
    maxInterval: 3600,    // At least every hour
    minChange: 10,        // 10Wh change
  },

  /**
   * Motion (alarm_motion) - For PIR sensors
   * - Report immediately (critical for automation)
   * - Heartbeat every hour
   */
  motion: {
    minInterval: 0,       // Report immediately
    maxInterval: 3600,    // Heartbeat every hour
    minChange: 1,         // Any change
  },

  /**
   * Contact (alarm_contact) - For door/window sensors
   * - Report immediately (security critical)
   * - Heartbeat every hour
   */
  contact: {
    minInterval: 0,
    maxInterval: 3600,
    minChange: 1,
  },

  /**
   * Luminance - For light level sensors
   * - Moderate frequency
   * - Report on 100 lux change
   */
  luminance: {
    minInterval: 60,      // Max once per minute
    maxInterval: 300,     // At least every 5 minutes
    minChange: 100,       // 100 lux change
  },

  /**
   * OnOff state - For switches/lights
   * - Report immediately (user expects instant feedback)
   * - Heartbeat every 10 minutes
   */
  onoff: {
    minInterval: 0,       // Report immediately
    maxInterval: 600,     // Heartbeat every 10 minutes
    minChange: 1,         // Any change
  },

  /**
   * Dim level - For dimmers
   * - Report immediately
   * - At least every 30 seconds
   * - Report on 5% change
   */
  dim: {
    minInterval: 0,
    maxInterval: 30,
    minChange: 5,         // 5% change (0-100 scale)
  },

  /**
   * Color temperature - For tunable white lights
   * - Report immediately (user expects instant feedback)
   * - At least every minute
   */
  colorTemperature: {
    minInterval: 0,
    maxInterval: 60,
    minChange: 1,         // Any change (mireds)
  },

  /**
   * Color (hue/saturation) - For RGB lights
   * - Report immediately
   * - At least every minute
   */
  color: {
    minInterval: 0,
    maxInterval: 60,
    minChange: 1,
  },

  /**
   * Window coverings (position) - For blinds/curtains
   * - Report immediately (user expects feedback)
   * - At least every 30 seconds
   * - Report on 5% change
   */
  windowCoveringsPosition: {
    minInterval: 0,
    maxInterval: 30,
    minChange: 5,         // 5% position change
  },

  /**
   * Thermostat setpoint - For thermostats
   * - Report immediately when changed
   * - At least every 5 minutes
   */
  thermostatSetpoint: {
    minInterval: 0,
    maxInterval: 300,
    minChange: 50,        // 0.5°C
  },

  /**
   * Water leak - For water sensors (critical)
   * - Report immediately!
   * - Heartbeat every 30 minutes
   */
  waterLeak: {
    minInterval: 0,
    maxInterval: 1800,
    minChange: 1,
  },

  /**
   * Smoke alarm - For smoke detectors (critical!)
   * - Report immediately!
   * - Heartbeat every 10 minutes
   */
  smokeAlarm: {
    minInterval: 0,
    maxInterval: 600,
    minChange: 1,
  },

  /**
   * CO alarm - For CO detectors (critical!)
   * - Report immediately!
   * - Heartbeat every 10 minutes
   */
  coAlarm: {
    minInterval: 0,
    maxInterval: 600,
    minChange: 1,
  },

  /**
   * Generic alarm - For other alarms
   * - Report immediately
   * - Heartbeat every hour
   */
  alarm: {
    minInterval: 0,
    maxInterval: 3600,
    minChange: 1,
  },

  /**
   * Default fallback - Conservative config
   * - Use when capability type unknown
   */
  default: {
    minInterval: 60,
    maxInterval: 3600,
    minChange: 1,
  },
};

/**
 * Get optimized reporting config for a capability
 * @param {string} capabilityId - Homey capability ID (e.g., 'measure_temperature')
 * @returns {Object} Reporting configuration
 */
module.exports.getConfigForCapability = function(capabilityId) {
  // Map capability IDs to configs
  const capabilityMap = {
    'measure_battery': 'battery',
    'measure_voltage.battery': 'batteryVoltage',
    'alarm_battery': 'battery',
    
    'measure_temperature': 'temperature',
    'measure_humidity': 'humidity',
    'measure_pressure': 'pressure',
    
    'measure_power': 'power',
    'measure_voltage': 'voltage',
    'measure_current': 'current',
    'meter_power': 'energy',
    
    'alarm_motion': 'motion',
    'alarm_contact': 'contact',
    'alarm_water': 'waterLeak',
    'alarm_smoke': 'smokeAlarm',
    'alarm_co': 'coAlarm',
    'alarm_generic': 'alarm',
    
    'measure_luminance': 'luminance',
    
    'onoff': 'onoff',
    'dim': 'dim',
    'light_temperature': 'colorTemperature',
    'light_hue': 'color',
    'light_saturation': 'color',
    
    'windowcoverings_state': 'windowCoveringsPosition',
    'windowcoverings_set': 'windowCoveringsPosition',
    
    'target_temperature': 'thermostatSetpoint',
  };

  const configKey = capabilityMap[capabilityId] || 'default';
  return module.exports[configKey];
};

/**
 * Get reporting config with custom overrides
 * @param {string} capabilityId - Homey capability ID
 * @param {Object} overrides - Custom overrides
 * @returns {Object} Merged configuration
 */
module.exports.getConfigWithOverrides = function(capabilityId, overrides = {}) {
  const baseConfig = this.getConfigForCapability(capabilityId);
  return {
    ...baseConfig,
    ...overrides,
  };
};
