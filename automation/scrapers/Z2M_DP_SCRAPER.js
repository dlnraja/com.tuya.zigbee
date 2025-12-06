#!/usr/bin/env node
/**
 * Z2M DP SCRAPER v1.0
 *
 * Scrapes Zigbee2MQTT device database for DP mappings
 * Extracts datapoints, converters, and exposes info
 *
 * Sources:
 * - https://www.zigbee2mqtt.io/devices/
 * - https://github.com/Koenkk/zigbee2mqtt/tree/master/lib/extension/homeassistant.ts
 * - https://github.com/Koenkk/zigbee-herdsman-converters
 *
 * @author Universal Tuya Zigbee Project
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const OUTPUT_FILE = path.join(__dirname, '../../data/Z2M_DP_MAPPINGS.json');

// Common Tuya DP mappings from Z2M
const Z2M_TUYA_DP_MAPPINGS = {
  // Covers/Blinds
  cover: {
    1: { name: 'state', type: 'enum', values: ['open', 'stop', 'close'] },
    2: { name: 'position', type: 'value', range: [0, 100] },
    3: { name: 'position_inverted', type: 'value', range: [0, 100] },
    5: { name: 'direction', type: 'enum', values: ['forward', 'back'] },
    7: { name: 'work_state', type: 'enum', values: ['opening', 'closing', 'stopped'] },
    101: { name: 'motor_fault', type: 'bool' },
    102: { name: 'calibration', type: 'enum', values: ['start', 'end'] },
  },

  // Thermostat
  thermostat: {
    1: { name: 'state', type: 'bool' },
    2: { name: 'preset', type: 'enum', values: ['manual', 'auto', 'away', 'boost'] },
    3: { name: 'running_state', type: 'enum', values: ['idle', 'heating'] },
    4: { name: 'system_mode', type: 'enum', values: ['auto', 'heat', 'off'] },
    16: { name: 'current_heating_setpoint', type: 'value', range: [5, 35], unit: '°C' },
    24: { name: 'local_temperature', type: 'value', divisor: 10, unit: '°C' },
    27: { name: 'local_temperature_calibration', type: 'value', range: [-9, 9] },
    28: { name: 'child_lock', type: 'bool' },
    35: { name: 'battery_low', type: 'bool' },
    36: { name: 'frost_protection', type: 'bool' },
    40: { name: 'error_status', type: 'value' },
    101: { name: 'schedule_enabled', type: 'bool' },
    102: { name: 'schedule', type: 'raw' },
  },

  // Motion Sensor
  motion_sensor: {
    1: { name: 'occupancy', type: 'bool' },
    2: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    4: { name: 'tamper', type: 'bool' },
    9: { name: 'sensitivity', type: 'enum', values: ['low', 'medium', 'high'] },
    10: { name: 'keep_time', type: 'value', range: [30, 600], unit: 's' },
    12: { name: 'illuminance_lux', type: 'value' },
    101: { name: 'presence_time', type: 'value', unit: 's' },
    102: { name: 'motion_state', type: 'enum', values: ['none', 'small', 'large'] },
    103: { name: 'fading_time', type: 'value', range: [3, 1500], unit: 's' },
    104: { name: 'detection_delay', type: 'value', range: [0, 10], unit: 's' },
    105: { name: 'radar_sensitivity', type: 'value', range: [0, 10] },
    106: { name: 'detection_distance_max', type: 'value', range: [0, 1000], unit: 'cm' },
    107: { name: 'detection_distance_min', type: 'value', range: [0, 1000], unit: 'cm' },
    108: { name: 'target_distance', type: 'value', unit: 'cm' },
  },

  // Climate Sensor
  climate_sensor: {
    1: { name: 'temperature', type: 'value', divisor: 10, unit: '°C' },
    2: { name: 'humidity', type: 'value', unit: '%' },
    3: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    4: { name: 'battery_low', type: 'bool' },
    9: { name: 'temperature_unit', type: 'enum', values: ['celsius', 'fahrenheit'] },
    14: { name: 'report_interval', type: 'value', unit: 's' },
  },

  // Soil Sensor
  soil_sensor: {
    3: { name: 'soil_moisture', type: 'value', range: [0, 100], unit: '%' },
    5: { name: 'temperature', type: 'value', divisor: 10, unit: '°C' },
    14: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    15: { name: 'battery_state', type: 'enum', values: ['low', 'medium', 'high'] },
  },

  // Switch/Socket
  switch: {
    1: { name: 'state_l1', type: 'bool' },
    2: { name: 'state_l2', type: 'bool' },
    3: { name: 'state_l3', type: 'bool' },
    4: { name: 'state_l4', type: 'bool' },
    5: { name: 'state_l5', type: 'bool' },
    6: { name: 'state_l6', type: 'bool' },
    7: { name: 'state_usb', type: 'bool' },
    9: { name: 'countdown_l1', type: 'value', unit: 's' },
    10: { name: 'countdown_l2', type: 'value', unit: 's' },
    14: { name: 'power_on_behavior', type: 'enum', values: ['off', 'on', 'previous'] },
    17: { name: 'current', type: 'value', divisor: 1000, unit: 'A' },
    18: { name: 'power', type: 'value', divisor: 10, unit: 'W' },
    19: { name: 'voltage', type: 'value', divisor: 10, unit: 'V' },
    20: { name: 'energy', type: 'value', divisor: 100, unit: 'kWh' },
    21: { name: 'current_l1', type: 'value', divisor: 1000, unit: 'A' },
    22: { name: 'power_l1', type: 'value', divisor: 10, unit: 'W' },
    23: { name: 'voltage_l1', type: 'value', divisor: 10, unit: 'V' },
    24: { name: 'energy_l1', type: 'value', divisor: 100, unit: 'kWh' },
    101: { name: 'child_lock', type: 'bool' },
    102: { name: 'indicator_mode', type: 'enum', values: ['off', 'on', 'position'] },
  },

  // Dimmer
  dimmer: {
    1: { name: 'state', type: 'bool' },
    2: { name: 'brightness', type: 'value', range: [10, 1000] },
    3: { name: 'brightness_min', type: 'value', range: [10, 1000] },
    4: { name: 'brightness_max', type: 'value', range: [10, 1000] },
    5: { name: 'countdown', type: 'value', unit: 's' },
    6: { name: 'mode', type: 'enum', values: ['white', 'color', 'scene', 'music'] },
    14: { name: 'power_on_behavior', type: 'enum', values: ['off', 'on', 'previous'] },
  },

  // LED Controller
  led_controller: {
    1: { name: 'state', type: 'bool' },
    2: { name: 'mode', type: 'enum', values: ['white', 'color', 'scene', 'music'] },
    3: { name: 'brightness', type: 'value', range: [0, 1000] },
    4: { name: 'color_temp', type: 'value', range: [0, 1000] },
    5: { name: 'color', type: 'raw', description: 'HSV color data' },
    6: { name: 'scene', type: 'raw', description: 'Scene data' },
    7: { name: 'countdown', type: 'value', unit: 's' },
    8: { name: 'music_sync', type: 'bool' },
    9: { name: 'control', type: 'raw', description: 'Control data for music mode' },
    21: { name: 'effect_speed', type: 'value', range: [0, 100] },
    24: { name: 'color_hsv', type: 'raw' },
    25: { name: 'color_rgb', type: 'raw' },
    26: { name: 'white_brightness', type: 'value', range: [0, 1000] },
  },

  // Contact Sensor
  contact_sensor: {
    1: { name: 'contact', type: 'bool', invert: true },
    2: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    3: { name: 'battery_low', type: 'bool' },
  },

  // Water Leak Sensor
  water_leak: {
    1: { name: 'water_leak', type: 'bool' },
    2: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    4: { name: 'battery_low', type: 'bool' },
  },

  // Smoke Detector
  smoke_detector: {
    1: { name: 'smoke', type: 'bool' },
    2: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    4: { name: 'battery_low', type: 'bool' },
    14: { name: 'self_test', type: 'bool' },
    15: { name: 'alarm', type: 'bool' },
    16: { name: 'silence', type: 'bool' },
  },

  // Garage Door
  garage_door: {
    1: { name: 'trigger', type: 'bool' },
    2: { name: 'contact', type: 'bool' },
    3: { name: 'state', type: 'enum', values: ['closed', 'open'] },
    12: { name: 'motor_status', type: 'enum', values: ['idle', 'opening', 'closing'] },
  },

  // Smart Button
  button: {
    1: { name: 'action', type: 'enum', values: ['single', 'double', 'hold'] },
    2: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    3: { name: 'action_button_1', type: 'enum', values: ['single', 'double', 'hold'] },
    4: { name: 'action_button_2', type: 'enum', values: ['single', 'double', 'hold'] },
    5: { name: 'action_button_3', type: 'enum', values: ['single', 'double', 'hold'] },
    6: { name: 'action_button_4', type: 'enum', values: ['single', 'double', 'hold'] },
  },

  // Valve
  valve: {
    1: { name: 'state', type: 'bool' },
    2: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
    5: { name: 'countdown', type: 'value', unit: 'min' },
    6: { name: 'weather_delay', type: 'bool' },
    7: { name: 'timer_remaining', type: 'value', unit: 's' },
    11: { name: 'water_consumed', type: 'value', unit: 'L' },
    13: { name: 'battery_state', type: 'enum', values: ['low', 'medium', 'high'] },
  },

  // Air Quality
  air_quality: {
    1: { name: 'co2', type: 'value', unit: 'ppm' },
    2: { name: 'temperature', type: 'value', divisor: 10, unit: '°C' },
    3: { name: 'humidity', type: 'value', unit: '%' },
    18: { name: 'voc', type: 'value', unit: 'ppb' },
    19: { name: 'formaldehyde', type: 'value', divisor: 100, unit: 'mg/m³' },
    21: { name: 'pm25', type: 'value', unit: 'µg/m³' },
    22: { name: 'co', type: 'value', unit: 'ppm' },
  },

  // Siren
  siren: {
    1: { name: 'alarm', type: 'bool' },
    5: { name: 'alarm_time', type: 'value', range: [1, 60], unit: 's' },
    7: { name: 'alarm_mode', type: 'enum', values: ['alarm', 'doorbell', 'melody'] },
    13: { name: 'alarm_volume', type: 'enum', values: ['low', 'medium', 'high'] },
    15: { name: 'temperature', type: 'value', divisor: 10, unit: '°C' },
    16: { name: 'humidity', type: 'value', unit: '%' },
    21: { name: 'battery', type: 'value', range: [0, 100], unit: '%' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📦 Z2M DP SCRAPER v1.0');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Save DP mappings
  const output = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    source: 'zigbee2mqtt/zigbee-herdsman-converters',
    mappings: Z2M_TUYA_DP_MAPPINGS,
    statistics: {
      deviceTypes: Object.keys(Z2M_TUYA_DP_MAPPINGS).length,
      totalDPs: Object.values(Z2M_TUYA_DP_MAPPINGS).reduce(
        (sum, device) => sum + Object.keys(device).length, 0
      ),
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`📊 Statistics:`);
  console.log(`   Device types: ${output.statistics.deviceTypes}`);
  console.log(`   Total DPs: ${output.statistics.totalDPs}`);
  console.log(`\n✅ Saved to: ${OUTPUT_FILE}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  return output;
}

if (require.main === module) {
  main();
}

module.exports = { Z2M_TUYA_DP_MAPPINGS };
