'use strict';
// v9.0.40: Fault Bitmap Decoder
// Inspired by Z2M's fault bitmap decoding for Tuya circuit breakers and water meters
// Decodes bitfield fault codes into human-readable descriptions

/**
 * Common fault bitmaps used by Tuya protection devices
 */
const FAULT_BITMAPS = {
  // Circuit breaker faults (DP 17 or similar)
  CIRCUIT_BREAKER: {
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
};
