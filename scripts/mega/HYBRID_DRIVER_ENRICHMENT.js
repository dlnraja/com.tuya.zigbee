#!/usr/bin/env node
/**
 * HYBRID DRIVER ENRICHMENT SCRIPT
 *
 * Enrichit tous les drivers avec:
 * - Capacités ZCL (Zigbee Cluster Library)
 * - Capacités Tuya DP (Data Points)
 * - Les deux peuvent coexister dans un driver HYBRIDE
 *
 * Sources:
 * - Zigbee2MQTT converters
 * - Tuya DP database
 * - Homey SDK3 capabilities
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

// =============================================================================
// ZIGBEE CLUSTER LIBRARY (ZCL) - Clusters numériques SDK3
// =============================================================================
const ZCL_CLUSTERS = {
  BASIC: 0,
  POWER_CONFIGURATION: 1,
  DEVICE_TEMPERATURE: 2,
  IDENTIFY: 3,
  GROUPS: 4,
  SCENES: 5,
  ON_OFF: 6,
  ON_OFF_SWITCH_CONFIG: 7,
  LEVEL_CONTROL: 8,
  ALARMS: 9,
  TIME: 10,
  ANALOG_INPUT: 12,
  ANALOG_OUTPUT: 13,
  ANALOG_VALUE: 14,
  BINARY_INPUT: 15,
  BINARY_OUTPUT: 16,
  BINARY_VALUE: 17,
  MULTISTATE_INPUT: 18,
  MULTISTATE_OUTPUT: 19,
  MULTISTATE_VALUE: 20,
  OTA_UPGRADE: 25,
  POLL_CONTROL: 32,
  SHADE_CONFIG: 256,
  DOOR_LOCK: 257,
  WINDOW_COVERING: 258,
  PUMP_CONFIG: 512,
  THERMOSTAT: 513,
  FAN_CONTROL: 514,
  DEHUMIDIFICATION: 515,
  THERMOSTAT_UI: 516,
  COLOR_CONTROL: 768,
  BALLAST_CONFIG: 769,
  ILLUMINANCE_MEASUREMENT: 1024,
  ILLUMINANCE_LEVEL_SENSING: 1025,
  TEMPERATURE_MEASUREMENT: 1026,
  PRESSURE_MEASUREMENT: 1027,
  FLOW_MEASUREMENT: 1028,
  RELATIVE_HUMIDITY: 1029,
  OCCUPANCY_SENSING: 1030,
  SOIL_MOISTURE: 1032,
  LEAF_WETNESS: 1033,
  IAS_ZONE: 1280,
  IAS_ACE: 1281,
  IAS_WD: 1282,
  METERING: 1794,
  ELECTRICAL_MEASUREMENT: 2820,
  DIAGNOSTICS: 2821,
  TUYA_SPECIFIC: 61184  // 0xEF00
};

// =============================================================================
// TUYA DATA POINTS (DP) - Pour devices TS0601
// =============================================================================
const TUYA_DPS = {
  // SWITCHES & RELAYS
  SWITCH_1: 1,
  SWITCH_2: 2,
  SWITCH_3: 3,
  SWITCH_4: 4,
  SWITCH_5: 5,
  SWITCH_6: 6,
  SWITCH_7: 7,
  SWITCH_8: 8,

  // BATTERY
  BATTERY_PERCENTAGE: 4,
  BATTERY_STATE: 14,
  BATTERY_VOLTAGE: 15,

  // CLIMATE
  TEMPERATURE: 1,
  HUMIDITY: 2,
  TEMP_UNIT: 9,
  MAX_TEMP: 10,
  MIN_TEMP: 11,

  // THERMOSTAT
  SYSTEM_MODE: 1,
  TARGET_TEMP: 2,
  CURRENT_TEMP: 3,
  RUNNING_STATE: 4,
  CHILD_LOCK: 7,
  HEATING_SETPOINT: 16,
  LOCAL_TEMP: 24,

  // DIMMER
  DIMMER_STATE: 1,
  DIMMER_BRIGHTNESS: 2,
  DIMMER_MIN: 3,
  DIMMER_MAX: 4,
  DIMMER_MODE: 14,

  // CURTAIN/COVER
  CURTAIN_STATE: 1,      // open/close/stop
  CURTAIN_POSITION: 2,   // 0-100%
  CURTAIN_ARRIVED: 3,    // position reached
  CURTAIN_MODE: 5,       // motor mode
  CURTAIN_DIRECTION: 8,  // motor direction

  // MOTION/PRESENCE
  MOTION_STATE: 1,
  PRESENCE_STATE: 1,
  MOTION_SENSITIVITY: 2,
  ILLUMINANCE: 4,
  RADAR_SENSITIVITY: 2,
  RADAR_DISTANCE: 9,
  RADAR_PRESENCE_TIME: 10,

  // AIR QUALITY
  CO2: 2,
  VOC: 3,
  FORMALDEHYDE: 5,
  PM25: 18,

  // WATER/VALVE
  VALVE_STATE: 1,
  WATER_FLOW: 5,
  WATER_AMOUNT: 6,
  IRRIGATION_TIME: 11,

  // ENERGY/POWER
  POWER: 19,
  CURRENT: 18,
  VOLTAGE: 20,
  ENERGY: 17,

  // ALARM/SAFETY
  ALARM_STATE: 1,
  SMOKE_DETECTED: 1,
  GAS_DETECTED: 1,
  CO_DETECTED: 1,
  WATER_LEAK: 1,
  TAMPER: 4,

  // LOCK
  LOCK_STATE: 1,
  LOCK_MODE: 2,
  LOCK_BATTERY: 3,

  // LED/LIGHT
  LED_STATE: 1,
  LED_MODE: 2,
  LED_BRIGHTNESS: 3,
  LED_COLOR_TEMP: 4,
  LED_RGB: 5,
  LED_HSV: 5,
  LED_SCENE: 6,
  LED_SPEED: 7,

  // FAN
  FAN_STATE: 1,
  FAN_SPEED: 3,
  FAN_MODE: 2,
  FAN_DIRECTION: 4
};

// =============================================================================
// DRIVER CAPABILITY DEFINITIONS
// =============================================================================
const DRIVER_CAPABILITIES = {
  // CLIMATE SENSORS
  climate_sensor: {
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.RELATIVE_HUMIDITY, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { temperature: 1, humidity: 2, battery: 4 }
    },
    energy: { batteries: ['AAA', 'CR2032', 'CR2450'] }
  },

  soil_sensor: {
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.SOIL_MOISTURE, ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { temperature: 3, humidity: 5, battery: 15 }
    },
    energy: { batteries: ['AAA', 'CR2032'] }
  },

  // MOTION SENSORS
  motion_sensor: {
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.OCCUPANCY_SENSING, ZCL_CLUSTERS.ILLUMINANCE_MEASUREMENT, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.POWER_CONFIGURATION, ZCL_CLUSTERS.IAS_ZONE]
    },
    tuya: {
      dps: { motion: 1, illuminance: 4, battery: 4, sensitivity: 2 }
    },
    energy: { batteries: ['CR2450', 'CR123A', 'AAA'] }
  },

  motion_sensor_radar_mmwave: {
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_temperature', 'measure_humidity', 'measure_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.OCCUPANCY_SENSING, ZCL_CLUSTERS.ILLUMINANCE_MEASUREMENT, ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.RELATIVE_HUMIDITY],
      bindings: []
    },
    tuya: {
      dps: { presence: 1, sensitivity: 2, detection_delay: 3, fading_time: 4, illuminance: 104, distance: 9 }
    },
    settings: ['radar_sensitivity', 'detection_delay', 'fading_time', 'max_distance']
  },

  presence_sensor_radar: {
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_distance'],
    zcl: {
      clusters: [ZCL_CLUSTERS.OCCUPANCY_SENSING, ZCL_CLUSTERS.ILLUMINANCE_MEASUREMENT],
      bindings: []
    },
    tuya: {
      dps: { presence: 1, sensitivity: 2, radar_scene: 4, distance: 9, illuminance: 104 }
    },
    settings: ['radar_sensitivity', 'radar_scene', 'detection_delay', 'fading_time']
  },

  // CONTACT SENSORS
  contact_sensor: {
    capabilities: ['alarm_contact', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.POWER_CONFIGURATION, ZCL_CLUSTERS.IAS_ZONE]
    },
    tuya: {
      dps: { contact: 1, battery: 4 }
    },
    energy: { batteries: ['CR2032', 'CR1632', 'AAA'] }
  },

  // SWITCHES
  switch_1gang: {
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING],
      bindings: [ZCL_CLUSTERS.ON_OFF]
    },
    tuya: {
      dps: { switch_1: 1, power: 19, voltage: 20, current: 18, energy: 17 }
    }
  },

  switch_2gang: {
    capabilities: ['onoff', 'onoff.1', 'measure_power', 'meter_power'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING],
      bindings: [ZCL_CLUSTERS.ON_OFF]
    },
    tuya: {
      dps: { switch_1: 1, switch_2: 2, power: 19, voltage: 20, current: 18 }
    },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Switch 1' } },
      'onoff.1': { title: { en: 'Switch 2' } }
    }
  },

  switch_3gang: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'measure_power', 'meter_power'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT],
      bindings: [ZCL_CLUSTERS.ON_OFF]
    },
    tuya: {
      dps: { switch_1: 1, switch_2: 2, switch_3: 3, power: 19 }
    },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Switch 1' } },
      'onoff.1': { title: { en: 'Switch 2' } },
      'onoff.2': { title: { en: 'Switch 3' } }
    }
  },

  switch_4gang: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'measure_power'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT],
      bindings: [ZCL_CLUSTERS.ON_OFF]
    },
    tuya: {
      dps: { switch_1: 1, switch_2: 2, switch_3: 3, switch_4: 4, power: 19 }
    },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Switch 1' } },
      'onoff.1': { title: { en: 'Switch 2' } },
      'onoff.2': { title: { en: 'Switch 3' } },
      'onoff.3': { title: { en: 'Switch 4' } }
    }
  },

  // DIMMERS
  dimmer_wall_1gang: {
    capabilities: ['onoff', 'dim', 'measure_power'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL]
    },
    tuya: {
      dps: { state: 1, brightness: 2, min_brightness: 3, max_brightness: 4 }
    },
    settings: ['dimmer_mode', 'min_brightness', 'max_brightness', 'transition_time']
  },

  dimmer_dual_channel: {
    capabilities: ['onoff', 'dim', 'onoff.1', 'dim.1'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL]
    },
    tuya: {
      dps: { state_1: 1, brightness_1: 2, state_2: 7, brightness_2: 8 }
    },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Channel 1' } },
      'dim': { title: { en: 'Brightness 1' } },
      'onoff.1': { title: { en: 'Channel 2' } },
      'dim.1': { title: { en: 'Brightness 2' } }
    }
  },

  // PLUGS
  plug_smart: {
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING],
      bindings: [ZCL_CLUSTERS.ON_OFF]
    },
    tuya: {
      dps: { state: 1, power: 19, voltage: 20, current: 18, energy: 17 }
    },
    settings: ['led_indicator', 'power_on_behavior', 'child_lock']
  },

  plug_energy_monitor: {
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT]
    },
    tuya: {
      dps: { state: 1, power: 19, voltage: 20, current: 18, energy: 17, power_factor: 21 }
    },
    settings: ['overload_protection', 'overload_threshold', 'led_indicator']
  },

  // THERMOSTATS
  thermostat_tuya_dp: {
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
    zcl: {
      clusters: [ZCL_CLUSTERS.THERMOSTAT, ZCL_CLUSTERS.THERMOSTAT_UI],
      bindings: [ZCL_CLUSTERS.THERMOSTAT]
    },
    tuya: {
      dps: { system_mode: 1, target_temp: 2, current_temp: 3, running_state: 4, child_lock: 7, heating_setpoint: 16 }
    },
    settings: ['temperature_calibration', 'child_lock', 'schedule_mode']
  },

  radiator_valve: {
    capabilities: ['target_temperature', 'measure_temperature', 'measure_battery', 'alarm_battery', 'thermostat_mode'],
    zcl: {
      clusters: [ZCL_CLUSTERS.THERMOSTAT, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.THERMOSTAT, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { system_mode: 1, target_temp: 2, current_temp: 3, battery: 14, child_lock: 7, valve_position: 104 }
    },
    energy: { batteries: ['AA'] },
    settings: ['temperature_calibration', 'child_lock', 'window_detection', 'valve_force']
  },

  // CURTAINS
  curtain_motor: {
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'dim'],
    zcl: {
      clusters: [ZCL_CLUSTERS.WINDOW_COVERING, ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL],
      bindings: [ZCL_CLUSTERS.WINDOW_COVERING]
    },
    tuya: {
      dps: { state: 1, position: 2, arrived: 3, motor_mode: 5, motor_direction: 8 }
    },
    settings: ['motor_direction', 'calibration_time', 'motor_speed']
  },

  curtain_motor_tilt: {
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set'],
    zcl: {
      clusters: [ZCL_CLUSTERS.WINDOW_COVERING],
      bindings: [ZCL_CLUSTERS.WINDOW_COVERING]
    },
    tuya: {
      dps: { state: 1, position: 2, tilt: 3, motor_mode: 5 }
    },
    settings: ['motor_direction', 'tilt_range']
  },

  // LIGHTS
  bulb_dimmable: {
    capabilities: ['onoff', 'dim'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL]
    },
    tuya: {
      dps: { state: 1, brightness: 2 }
    }
  },

  bulb_tunable_white: {
    capabilities: ['onoff', 'dim', 'light_temperature'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL]
    },
    tuya: {
      dps: { state: 1, brightness: 2, color_temp: 3 }
    }
  },

  bulb_rgb: {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_mode'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL]
    },
    tuya: {
      dps: { state: 1, mode: 2, brightness: 3, color_temp: 4, hsv: 5 }
    }
  },

  bulb_rgbw: {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL]
    },
    tuya: {
      dps: { state: 1, mode: 2, brightness: 3, color_temp: 4, hsv: 5, scene: 6 }
    }
  },

  led_strip: {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_mode'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL]
    },
    tuya: {
      dps: { state: 1, mode: 2, brightness: 3, color_temp: 4, hsv: 5, scene: 6, speed: 7 }
    },
    settings: ['effect_speed', 'music_sync']
  },

  // AIR QUALITY
  air_quality_co2: {
    capabilities: ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.RELATIVE_HUMIDITY, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { co2: 2, temperature: 18, humidity: 19, battery: 15 }
    },
    energy: { batteries: ['AAA', 'USB'] }
  },

  air_quality_comprehensive: {
    capabilities: ['measure_co2', 'measure_pm25', 'measure_voc', 'measure_temperature', 'measure_humidity'],
    zcl: {
      clusters: [ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.RELATIVE_HUMIDITY],
      bindings: []
    },
    tuya: {
      dps: { co2: 2, voc: 3, formaldehyde: 5, pm25: 18, temperature: 18, humidity: 19 }
    }
  },

  formaldehyde_sensor: {
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.RELATIVE_HUMIDITY, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { formaldehyde: 5, temperature: 18, humidity: 19, battery: 4 }
    },
    energy: { batteries: ['CR2450', 'AAA'] }
  },

  // SAFETY
  smoke_detector_advanced: {
    capabilities: ['alarm_smoke', 'alarm_battery', 'measure_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { smoke: 1, battery: 14, tamper: 4, self_test: 9 }
    },
    energy: { batteries: ['CR2', 'CR123A'] }
  },

  gas_sensor: {
    capabilities: ['alarm_gas', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.IAS_ZONE]
    },
    tuya: {
      dps: { gas: 1, gas_concentration: 2, battery: 14, self_test: 9 }
    },
    energy: { batteries: ['CR2450', 'AAA'] }
  },

  gas_detector: {
    capabilities: ['alarm_gas', 'alarm_co'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE],
      bindings: [ZCL_CLUSTERS.IAS_ZONE]
    },
    tuya: {
      dps: { gas: 1, gas_concentration: 2, alarm_volume: 14 }
    }
  },

  co_sensor: {
    capabilities: ['alarm_co', 'measure_co', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { co: 1, co_concentration: 2, battery: 14, self_test: 9 }
    },
    energy: { batteries: ['CR2', 'CR123A', 'AAA'] }
  },

  water_leak_sensor: {
    capabilities: ['alarm_water', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { water_leak: 1, battery: 4 }
    },
    energy: { batteries: ['CR2032', 'CR2450', 'AAA'] }
  },

  // VALVES
  water_valve_smart: {
    capabilities: ['onoff', 'alarm_water', 'measure_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.ON_OFF]
    },
    tuya: {
      dps: { valve_state: 1, water_flow: 5, battery: 15 }
    },
    energy: { batteries: ['AA'] }
  },

  valve_irrigation: {
    capabilities: ['onoff', 'measure_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.ON_OFF]
    },
    tuya: {
      dps: { valve_state: 1, irrigation_time: 11, water_amount: 6, battery: 15 }
    },
    energy: { batteries: ['AA'] },
    settings: ['irrigation_duration', 'water_amount_limit']
  },

  // BUTTONS
  button_wireless_1: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { action: 1, battery: 3 }
    },
    energy: { batteries: ['CR2032', 'CR2450'] }
  },

  button_wireless_4: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { action_1: 1, action_2: 2, action_3: 3, action_4: 4, battery: 10 }
    },
    energy: { batteries: ['CR2032', 'CR2450', 'AAA'] }
  },

  button_emergency_sos: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { sos: 1, battery: 4 }
    },
    energy: { batteries: ['CR2032', 'CR2450'] }
  },

  // SIREN
  siren: {
    capabilities: ['onoff', 'alarm_generic', 'measure_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_WD, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.IAS_WD]
    },
    tuya: {
      dps: { alarm: 13, volume: 5, duration: 7, melody: 21, battery: 15 }
    },
    energy: { batteries: ['USB', 'Li-ion'] },
    settings: ['alarm_duration', 'alarm_volume', 'alarm_melody']
  },

  // LOCK
  lock_smart: {
    capabilities: ['locked', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.DOOR_LOCK, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.DOOR_LOCK, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { lock_state: 1, lock_mode: 2, battery: 3 }
    },
    energy: { batteries: ['AA'] },
    settings: ['auto_lock', 'auto_lock_delay']
  },

  // FAN
  ceiling_fan: {
    capabilities: ['onoff', 'dim', 'fan_speed'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.FAN_CONTROL, ZCL_CLUSTERS.LEVEL_CONTROL],
      bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.FAN_CONTROL]
    },
    tuya: {
      dps: { fan_state: 1, fan_mode: 2, fan_speed: 3, fan_direction: 4, light_state: 9, light_brightness: 10 }
    },
    settings: ['fan_direction', 'fan_timer']
  },

  // ENERGY
  power_meter: {
    capabilities: ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING],
      bindings: [ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT]
    },
    tuya: {
      dps: { power: 19, voltage: 20, current: 18, energy: 17 }
    }
  },

  energy_meter_3phase: {
    capabilities: ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    zcl: {
      clusters: [ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING],
      bindings: [ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT]
    },
    tuya: {
      dps: {
        power_a: 101, power_b: 102, power_c: 103, power_total: 19,
        voltage_a: 111, voltage_b: 112, voltage_c: 113,
        current_a: 121, current_b: 122, current_c: 123,
        energy: 17
      }
    }
  },

  // WEATHER
  weather_station_outdoor: {
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.RELATIVE_HUMIDITY, ZCL_CLUSTERS.PRESSURE_MEASUREMENT, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { temperature: 1, humidity: 2, pressure: 9, battery: 4 }
    },
    energy: { batteries: ['AAA', 'AA'] }
  },

  // VIBRATION
  vibration_sensor: {
    capabilities: ['alarm_vibration', 'alarm_tamper', 'measure_battery', 'alarm_battery'],
    zcl: {
      clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION],
      bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION]
    },
    tuya: {
      dps: { vibration: 1, sensitivity: 2, battery: 4 }
    },
    energy: { batteries: ['CR2032', 'CR2450'] }
  }
};

// =============================================================================
// ENRICHMENT FUNCTIONS
// =============================================================================

function enrichDriver(driverId) {
  const driverPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');

  if (!fs.existsSync(driverPath)) {
    return { success: false, reason: 'not_found' };
  }

  const config = DRIVER_CAPABILITIES[driverId];
  if (!config) {
    return { success: false, reason: 'no_config' };
  }

  try {
    const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    let modified = false;

    // Add capabilities
    if (config.capabilities) {
      const existingCaps = new Set(driver.capabilities || []);
      for (const cap of config.capabilities) {
        if (!existingCaps.has(cap)) {
          if (!driver.capabilities) driver.capabilities = [];
          driver.capabilities.push(cap);
          modified = true;
        }
      }
    }

    // Update ZCL clusters
    if (config.zcl && driver.zigbee) {
      const endpoint = driver.zigbee.endpoints?.['1'] || driver.zigbee.endpoints?.['11'] || {};
      const existingClusters = new Set(endpoint.clusters || []);

      for (const cluster of config.zcl.clusters) {
        if (!existingClusters.has(cluster)) {
          if (!endpoint.clusters) endpoint.clusters = [];
          endpoint.clusters.push(cluster);
          modified = true;
        }
      }

      // Update bindings
      if (config.zcl.bindings && config.zcl.bindings.length > 0) {
        const existingBindings = new Set(endpoint.bindings || []);
        for (const binding of config.zcl.bindings) {
          if (!existingBindings.has(binding)) {
            if (!endpoint.bindings) endpoint.bindings = [];
            endpoint.bindings.push(binding);
            modified = true;
          }
        }
      }

      // Save back to endpoint
      if (!driver.zigbee.endpoints) driver.zigbee.endpoints = {};
      driver.zigbee.endpoints['1'] = endpoint;
    }

    // Add energy batteries
    if (config.energy && config.energy.batteries) {
      if (!driver.energy) driver.energy = {};
      driver.energy.batteries = config.energy.batteries;
      modified = true;
    }

    // Add capabilitiesOptions
    if (config.capabilitiesOptions) {
      if (!driver.capabilitiesOptions) driver.capabilitiesOptions = {};
      for (const [cap, opts] of Object.entries(config.capabilitiesOptions)) {
        if (!driver.capabilitiesOptions[cap]) {
          driver.capabilitiesOptions[cap] = opts;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n');
      return { success: true, modified: true };
    }

    return { success: true, modified: false };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// =============================================================================
// MAIN
// =============================================================================

console.log('🔧 HYBRID DRIVER ENRICHMENT SCRIPT');
console.log('===================================\n');
console.log('Enrichit chaque driver avec:');
console.log('  - Capacités ZCL (clusters numériques)');
console.log('  - Tuya DPs (Data Points)');
console.log('  - energy.batteries');
console.log('  - capabilitiesOptions\n');

const results = {
  enriched: 0,
  unchanged: 0,
  skipped: 0,
  errors: 0
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

for (const driverId of drivers) {
  const result = enrichDriver(driverId);

  if (result.success && result.modified) {
    console.log(`✅ ${driverId}: enrichi`);
    results.enriched++;
  } else if (result.success && !result.modified) {
    console.log(`⏭️  ${driverId}: déjà complet`);
    results.unchanged++;
  } else if (result.reason === 'no_config') {
    console.log(`⚠️  ${driverId}: pas de config (ajouter manuellement)`);
    results.skipped++;
  } else {
    console.log(`❌ ${driverId}: ${result.reason}`);
    results.errors++;
  }
}

console.log('\n' + '='.repeat(50));
console.log('📊 RÉSUMÉ');
console.log('='.repeat(50));
console.log(`✅ Enrichis: ${results.enriched}`);
console.log(`⏭️  Inchangés: ${results.unchanged}`);
console.log(`⚠️  Skippés: ${results.skipped}`);
console.log(`❌ Erreurs: ${results.errors}`);
console.log('='.repeat(50));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'hybrid-driver-enrichment-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results,
  configuredDrivers: Object.keys(DRIVER_CAPABILITIES)
}, null, 2));

console.log(`\n📄 Rapport: ${reportPath}`);
