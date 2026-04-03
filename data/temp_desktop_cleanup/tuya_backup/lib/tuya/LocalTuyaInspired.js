'use strict';

/**
 * LocalTuyaInspired.js - v5.5.682
 * Inspired by LocalTuya + TinyTuya
 */

const TUYA_DP_TYPES = { RAW: 0, BOOL: 1, VALUE: 2, STRING: 3, ENUM: 4, BITMAP: 5 };

const ENTITY_TYPES = {
  SWITCH: { dps: [1, 2, 3, 4, 5, 6], capability: 'onoff' },
  LIGHT: { dps: [20, 21, 22, 23, 24, 25, 26], capability: 'onoff' },
  COVER: { dps: [1, 2, 3, 7], capability: 'windowcoverings_set' },
  CLIMATE: { dps: [2, 3, 4, 16, 24], capability: 'target_temperature' },
  FAN: { dps: [1, 3, 8, 9], capability: 'onoff' },
  SENSOR: { dps: [1, 2, 3, 4, 5], capability: 'measure_temperature' },
};

// Energy DPs (LocalTuya pattern)
const ENERGY_DPS = {
  17: { attr: 'current', divider: 1000, unit: 'A' },
  18: { attr: 'power', divider: 10, unit: 'W' },
  19: { attr: 'voltage', divider: 10, unit: 'V' },
  20: { attr: 'energy', divider: 100, unit: 'kWh' },
};

// Switch DPs (LocalTuya)
const SWITCH_DPS = {
  1: { cap: 'onoff', type: 'BOOL' },
  17: { cap: 'measure_current', div: 1000 },
  18: { cap: 'measure_power', div: 10 },
  19: { cap: 'measure_voltage', div: 10 },
  20: { cap: 'meter_power', div: 100 },
};

// Light DPs (LocalTuya)
const LIGHT_DPS = {
  20: { cap: 'onoff', type: 'BOOL' },
  21: { cap: null, type: 'ENUM', name: 'work_mode' },
  22: { cap: 'dim', range: [10, 1000] },
  23: { cap: 'light_temperature', range: [0, 1000] },
  24: { cap: 'light_hue', type: 'STRING' },
};

// Cover DPs (LocalTuya)
const COVER_DPS = {
  1: { cap: 'windowcoverings_state', type: 'ENUM' },
  2: { cap: 'windowcoverings_set', range: [0, 100] },
  3: { cap: 'dim', range: [0, 100] },
  7: { cap: null, type: 'ENUM', name: 'control' },
};

// Climate DPs (LocalTuya)
const CLIMATE_DPS = {
  1: { cap: 'onoff', type: 'BOOL' },
  2: { cap: 'target_temperature', div: 10 },
  3: { cap: 'measure_temperature', div: 10 },
  4: { cap: 'thermostat_mode', type: 'ENUM' },
  13: { cap: 'measure_battery' },
};

// Fan DPs
const FAN_DPS = { 1: { cap: 'onoff' }, 3: { cap: 'dim' } };

// Sensor DPs  
const SENSOR_DPS = { 1: { cap: 'alarm_motion' }, 3: { cap: 'measure_temperature', div: 10 }, 4: { cap: 'measure_battery' } };

module.exports = { TUYA_DP_TYPES, ENTITY_TYPES, ENERGY_DPS, SWITCH_DPS, LIGHT_DPS, COVER_DPS, CLIMATE_DPS, FAN_DPS, SENSOR_DPS };
