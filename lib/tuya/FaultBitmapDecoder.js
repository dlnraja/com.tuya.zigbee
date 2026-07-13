'use strict';
// v9.0.40: Fault Bitmap Decoder
// Inspired by Z2M's fault bitmap decoding for Tuya circuit breakers and water meters
// Decodes bitfield fault codes into human-readable descriptions
// v9.0.40+: Extended with Z2M's full 17-fault circuit breaker list + additional categories

/**
 * Common fault bitmaps used by Tuya protection devices
 * Sources: Z2M circuitBreakerFaults, ZHA tuya/__init__.py, forum reports
 */
const FAULT_BITMAPS = {
  // Circuit breaker faults (DP 17 or similar)
  // Extended to Z2M's full 17-fault list for comprehensive coverage
  CIRCUIT_BREAKER: {
    0x0001: 'short_circuit',
    0x0002: 'surge',
    0x0004: 'overload',
    0x0008: 'leakage_current',
    0x0010: 'over_temperature',
    0x0020: 'fire',
    0x0040: 'high_power',
    0x0080: 'self_test',
    0x0100: 'over_current',
    0x0200: 'unbalance',
    0x0400: 'over_voltage',
    0x0800: 'under_voltage',
    0x1000: 'miss_phase',
    0x2000: 'outage',
    0x4000: 'magnetism',
    0x8000: 'credit',
    0x10000: 'no_balance',
  },

  // Legacy circuit breaker (backward compatible)
  CIRCUIT_BREAKER_LEGACY: {
    0x0001: 'over_voltage',
    0x0002: 'under_voltage',
    0x0004: 'over_current',
    0x0008: 'over_power',
    0x0010: 'over_temperature',
    0x0020: 'leakage_current',
    0x0040: 'short_circuit',
    0x0080: 'surge',
    0x0100: 'phase_sequence',
    0x0200: 'phase_loss',
    0x0400: 'over_frequency',
    0x0800: 'under_frequency',
  },

  // Water meter faults
  WATER_METER: {
    0x0001: 'sensor_fault',
    0x0002: 'valve_fault',
    0x0004: 'low_battery',
    0x0008: 'over_flow',
    0x0010: 'reverse_flow',
    0x0020: 'blocked',
    0x0040: 'leak_detected',
    0x0080: 'freeze_warning',
  },

  // TRV/Thermostat faults
  THERMOSTAT: {
    0x0001: 'sensor_fault',
    0x0002: 'valve_stuck',
    0x0004: 'low_battery',
    0x0008: 'over_temperature',
    0x0010: 'communication_error',
  },

  // Air quality sensor faults
  AIR_QUALITY: {
    0x0001: 'sensor_warmup',
    0x0002: 'sensor_fault',
    0x0004: 'fan_fault',
    0x0008: 'filter_replace',
  },

  // Smart plug faults
  SMART_PLUG: {
    0x0001: 'over_temperature',
    0x0002: 'over_current',
    0x0004: 'over_power',
    0x0008: 'over_voltage',
    0x0010: 'under_voltage',
    0x0020: 'leakage',
  },

  // DIN rail energy meter faults
  ENERGY_METER: {
    0x0001: 'over_voltage',
    0x0002: 'under_voltage',
    0x0004: 'over_current',
    0x0008: 'over_power',
    0x0010: 'over_temperature',
    0x0020: 'leakage_current',
    0x0040: 'short_circuit',
    0x0080: 'surge',
    0x0100: 'phase_sequence',
    0x0200: 'phase_loss',
    0x0400: 'unbalance',
    0x0800: 'self_test',
  },

  // Smoke/gas detector faults
  SMOKE_GAS: {
    0x0001: 'sensor_fault',
    0x0002: 'battery_low',
    0x0004: 'communication_error',
    0x0008: 'end_of_life',
    0x0010: 'dust_accumulation',
  },

  // Cover/blind motor faults
  COVER_MOTOR: {
    0x0001: 'motor_fault',
    0x0002: 'over_temperature',
    0x0004: 'obstacle_detected',
    0x0008: 'limit_switch_fault',
    0x0010: 'position_lost',
  },
};

/**
 * Decode a fault bitmap into active fault names
 * @param {number} bitmap - The fault bitmap value
 * @param {string} type - Fault bitmap type (from FAULT_BITMAPS)
 * @returns {string[]} - Array of active fault names
 */
function decodeFaults(bitmap, type = 'CIRCUIT_BREAKER') {
  const table = FAULT_BITMAPS[type];
  if (!table) return [`unknown_type_${type}`];

  const faults = [];
  for (const [bit, name] of Object.entries(table)) {
    if (bitmap & Number(bit)) {
      faults.push(name);
    }
  }
  return faults;
}

/**
 * Decode faults and return as a formatted string
 * @param {number} bitmap
 * @param {string} type
 * @returns {string}
 */
function decodeFaultsString(bitmap, type = 'CIRCUIT_BREAKER') {
  const faults = decodeFaults(bitmap, type);
  return faults.length > 0 ? faults.join(', ') : 'none';
}

/**
 * Check if a specific fault is active
 * @param {number} bitmap
 * @param {string} type
 * @param {string} faultName
 * @returns {boolean}
 */
function hasFault(bitmap, type, faultName) {
  return decodeFaults(bitmap, type).includes(faultName);
}

/**
 * Create a transform function for a fault bitmap DP
 * @param {string} type - Fault bitmap type
 * @returns {function} Transform function for dpMappings
 */
function faultBitmapTransform(type) {
  return (value) => {
    if (typeof value !== 'number') return 'none';
    return decodeFaultsString(value, type);
  };
}

module.exports = {
  FAULT_BITMAPS,
  decodeFaults,
  decodeFaultsString,
  hasFault,
  faultBitmapTransform,
  // Named fault type constants for convenience
  CIRCUIT_BREAKER: 'CIRCUIT_BREAKER',
  CIRCUIT_BREAKER_LEGACY: 'CIRCUIT_BREAKER_LEGACY',
  WATER_METER: 'WATER_METER',
  THERMOSTAT: 'THERMOSTAT',
  AIR_QUALITY: 'AIR_QUALITY',
  SMART_PLUG: 'SMART_PLUG',
  ENERGY_METER: 'ENERGY_METER',
  SMOKE_GAS: 'SMOKE_GAS',
  COVER_MOTOR: 'COVER_MOTOR',
};
