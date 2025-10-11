/**
 * TUYA DATAPOINTS DATABASE
 * 
 * Basé sur:
 * - Zigbee2MQTT converters (https://github.com/Koenkk/zigbee2mqtt)
 * - Tuya IoT documentation (https://developer.tuya.com/)
 * - Community reports and testing
 * 
 * Cluster Tuya: 0xEF00 (61184)
 */

module.exports = {
  
  /**
   * COMMON DATAPOINTS (used by multiple devices)
   */
  COMMON: {
    1: { 
      name: 'motion', 
      type: 'bool',
      capability: 'alarm_motion',
      parse: (value) => value === true || value === 1
    },
    2: { 
      name: 'battery', 
      type: 'value',
      capability: 'measure_battery',
      parse: (value) => Math.max(0, Math.min(100, parseInt(value)))
    },
    4: { 
      name: 'temperature', 
      type: 'value',
      capability: 'measure_temperature',
      parse: (value) => parseInt(value) / 10
    },
    5: { 
      name: 'humidity', 
      type: 'value',
      capability: 'measure_humidity',
      parse: (value) => Math.max(0, Math.min(100, parseInt(value)))
    },
    9: { 
      name: 'illuminance', 
      type: 'value',
      capability: 'measure_luminance',
      parse: (value) => parseInt(value)
    },
    13: { 
      name: 'button', 
      type: 'enum',
      capability: 'alarm_button',
      values: {
        0: 'single',
        1: 'double',
        2: 'hold'
      }
    },
    14: { 
      name: 'battery_low', 
      type: 'bool',
      capability: 'alarm_battery',
      parse: (value) => value === true || value === 1
    },
    15: { 
      name: 'battery_state', 
      type: 'enum',
      capability: 'alarm_battery',
      values: {
        0: 'low',
        1: 'medium', 
        2: 'high'
      }
    }
  },

  /**
   * MOTION SENSORS
   */
  MOTION_SENSOR: {
    1: { name: 'occupancy', type: 'bool', capability: 'alarm_motion' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    9: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
    101: { name: 'illuminance_lux', type: 'value', capability: 'measure_luminance' },
    102: { name: 'occupancy_timeout', type: 'value' },
    103: { name: 'sensitivity', type: 'enum', values: { 0: 'low', 1: 'medium', 2: 'high' } }
  },

  /**
   * PIR + RADAR (ZG-204ZM, mmWave)
   */
  PIR_RADAR: {
    1: { name: 'presence', type: 'bool', capability: 'alarm_motion' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    9: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
    101: { name: 'presence_state', type: 'enum', values: { 0: 'none', 1: 'presence' } },
    102: { name: 'radar_sensitivity', type: 'value' },
    104: { name: 'detection_distance', type: 'value' },
    105: { name: 'fading_time', type: 'value' }
  },

  /**
   * MULTI-SENSOR (ZG-204ZV: Motion + Temp + Humidity + Lux)
   */
  MULTI_SENSOR: {
    1: { name: 'motion', type: 'bool', capability: 'alarm_motion' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    4: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
    5: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
    9: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
    101: { name: 'tamper', type: 'bool', capability: 'alarm_tamper' }
  },

  /**
   * SMOKE DETECTOR
   */
  SMOKE_DETECTOR: {
    1: { name: 'smoke', type: 'bool', capability: 'alarm_smoke' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    11: { name: 'smoke_value', type: 'value', capability: 'measure_smoke' },
    14: { name: 'battery_low', type: 'bool', capability: 'alarm_battery' },
    15: { name: 'self_test', type: 'bool' },
    16: { name: 'silence', type: 'bool' },
    101: { name: 'fault_alarm', type: 'bool', capability: 'alarm_fault' }
  },

  /**
   * GAS DETECTOR
   */
  GAS_DETECTOR: {
    1: { name: 'gas', type: 'bool', capability: 'alarm_co' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    11: { name: 'gas_value', type: 'value' },
    13: { name: 'self_test', type: 'bool' },
    14: { name: 'mute', type: 'bool' }
  },

  /**
   * WATER LEAK DETECTOR
   */
  WATER_LEAK: {
    1: { name: 'water_leak', type: 'bool', capability: 'alarm_water' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    14: { name: 'battery_low', type: 'bool', capability: 'alarm_battery' }
  },

  /**
   * DOOR/WINDOW SENSOR
   */
  DOOR_WINDOW: {
    1: { name: 'contact', type: 'bool', capability: 'alarm_contact' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    3: { name: 'tamper', type: 'bool', capability: 'alarm_tamper' },
    14: { name: 'battery_low', type: 'bool', capability: 'alarm_battery' }
  },

  /**
   * BUTTON / SCENE CONTROLLER
   */
  BUTTON: {
    1: { name: 'action', type: 'enum', capability: 'alarm_button', values: {
      0: 'single', 1: 'double', 2: 'hold'
    }},
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    3: { name: 'button_number', type: 'value' }
  },

  /**
   * SOS EMERGENCY BUTTON
   */
  SOS_BUTTON: {
    1: { name: 'sos', type: 'bool', capability: 'alarm_generic' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    13: { name: 'action', type: 'enum', values: { 0: 'single', 1: 'double', 2: 'hold' } }
  },

  /**
   * TEMPERATURE SENSOR
   */
  TEMPERATURE: {
    1: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    3: { name: 'min_temperature', type: 'value', divide: 10 },
    4: { name: 'max_temperature', type: 'value', divide: 10 },
    9: { name: 'temperature_alarm', type: 'enum', values: { 0: 'lower', 1: 'upper', 2: 'cancel' } }
  },

  /**
   * HUMIDITY SENSOR
   */
  HUMIDITY: {
    1: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    5: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 }
  },

  /**
   * CO2 SENSOR
   */
  CO2_SENSOR: {
    1: { name: 'co2', type: 'value', capability: 'measure_co2' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    4: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
    5: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
    18: { name: 'co2_alarm', type: 'bool', capability: 'alarm_co2' }
  },

  /**
   * AIR QUALITY MONITOR (PM2.5, TVOC, etc.)
   */
  AIR_QUALITY: {
    1: { name: 'voc', type: 'value', capability: 'measure_voc' },
    2: { name: 'pm25', type: 'value', capability: 'measure_pm25' },
    4: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
    5: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
    13: { name: 'formaldehyde', type: 'value' },
    15: { name: 'co2', type: 'value', capability: 'measure_co2' }
  },

  /**
   * VIBRATION SENSOR
   */
  VIBRATION: {
    1: { name: 'vibration', type: 'bool', capability: 'alarm_motion' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    13: { name: 'sensitivity', type: 'enum', values: { 0: 'low', 1: 'medium', 2: 'high' } }
  },

  /**
   * THERMOSTAT / TRV
   */
  THERMOSTAT: {
    2: { name: 'target_temperature', type: 'value', capability: 'target_temperature', divide: 10 },
    3: { name: 'current_temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
    4: { name: 'mode', type: 'enum', capability: 'thermostat_mode', values: {
      0: 'auto', 1: 'manual', 2: 'away', 3: 'off'
    }},
    5: { name: 'valve_position', type: 'value' },
    7: { name: 'battery', type: 'value', capability: 'measure_battery' },
    8: { name: 'child_lock', type: 'bool' }
  },

  /**
   * SWITCH (1-6 gang)
   */
  SWITCH: {
    1: { name: 'state_l1', type: 'bool', capability: 'onoff' },
    2: { name: 'state_l2', type: 'bool', capability: 'onoff.2' },
    3: { name: 'state_l3', type: 'bool', capability: 'onoff.3' },
    4: { name: 'state_l4', type: 'bool', capability: 'onoff.4' },
    5: { name: 'state_l5', type: 'bool', capability: 'onoff.5' },
    6: { name: 'state_l6', type: 'bool', capability: 'onoff.6' },
    9: { name: 'countdown_1', type: 'value' },
    10: { name: 'countdown_2', type: 'value' },
    11: { name: 'countdown_3', type: 'value' },
    12: { name: 'countdown_4', type: 'value' }
  },

  /**
   * DIMMER
   */
  DIMMER: {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    2: { name: 'brightness', type: 'value', capability: 'dim', max: 1000, divide: 1000 },
    3: { name: 'min_brightness', type: 'value' },
    4: { name: 'countdown', type: 'value' },
    6: { name: 'light_mode', type: 'enum' }
  },

  /**
   * RGB LIGHT
   */
  RGB_LIGHT: {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    2: { name: 'mode', type: 'enum', values: { 0: 'white', 1: 'color', 2: 'scene' } },
    3: { name: 'brightness', type: 'value', capability: 'dim', divide: 1000 },
    5: { name: 'color_data', type: 'hex_color', capability: 'light_hue' },
    8: { name: 'scene', type: 'enum' }
  },

  /**
   * CURTAIN / BLIND MOTOR
   */
  CURTAIN: {
    1: { name: 'position', type: 'value', capability: 'windowcoverings_set', divide: 100 },
    2: { name: 'state', type: 'enum', values: { 0: 'open', 1: 'stop', 2: 'close' } },
    3: { name: 'mode', type: 'enum', values: { 0: 'morning', 1: 'night' } },
    5: { name: 'motor_direction', type: 'enum', values: { 0: 'forward', 1: 'back' } },
    7: { name: 'work_state', type: 'enum' }
  },

  /**
   * VALVE (Water/Gas)
   */
  VALVE: {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    5: { name: 'battery', type: 'value', capability: 'measure_battery' },
    11: { name: 'water_consumed', type: 'value', capability: 'meter_water' }
  },

  /**
   * LOCK
   */
  LOCK: {
    1: { name: 'state', type: 'bool', capability: 'locked' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    6: { name: 'unlock_method', type: 'enum', values: {
      0: 'fingerprint', 1: 'password', 2: 'card', 3: 'key', 4: 'app', 5: 'temporary_password'
    }},
    10: { name: 'wrong_finger', type: 'value' },
    11: { name: 'wrong_password', type: 'value' },
    12: { name: 'wrong_card', type: 'value' }
  },

  /**
   * SIREN
   */
  SIREN: {
    1: { name: 'alarm', type: 'bool', capability: 'alarm_generic' },
    5: { name: 'duration', type: 'value' },
    7: { name: 'volume', type: 'enum', values: { 0: 'low', 1: 'medium', 2: 'high' } },
    13: { name: 'melody', type: 'value' }
  }

};
