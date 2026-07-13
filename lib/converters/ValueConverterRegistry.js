'use strict';

/**
 * ValueConverterRegistry - Central registry of value converters
 *
 * Inspired by Z2M (zigbee-herdsman-converters) converter patterns.
 * Provides reusable value transformation functions for all drivers.
 *
 * v9.0.40: Added Z2M-inspired advanced converters:
 *   - localTemperatureCalibration: Two's complement temperature offset (4096/256-based)
 *   - phaseConverter: Parse base64 phase data for energy meters (voltage/current/power)
 *   - thermostatSchedule: Parse/encode multi-period thermostat schedules
 *   - waterConsumption: Parse 8-byte water meter buffer
 *   - thresholdParser: Parse/encode circuit breaker threshold bitmaps
 *   - lookup: Bidirectional lookup table with fallback
 *
 * Converter types:
 *   - numeric:   raw / divisor + offset
 *   - enum:      numeric <-> string mapping
 *   - boolean:   truthy/falsy coercion with configurable thresholds
 *   - bitfield:  parse individual bits from integer
 *   - clamp:     restrict value to min/max range
 *   - invert:    100 - value (for curtains with inverted position)
 *   - round:     decimal precision control
 *   - scale:     bidirectional linear range mapping
 *   - lookup:    string <-> value lookup with fallback
 *
 * Usage:
 *   const { converters, numeric, enumMap, boolean } = require('./ValueConverterRegistry');
 *
 *   // In dpMappings:
 *   '18': { capability: 'measure_temperature', transform: numeric({ divisor: 10 }) },
 *   '4':  { capability: 'thermostat_mode', transform: enumMap({ 0:'off', 1:'heat', 2:'auto' }) },
 *   '1':  { capability: 'onoff', transform: boolean() },
 *
 *   // Custom converter:
 *   const myConvert = converters.compose(numeric({ divisor: 100 }), clamp(0, 100));
 */

// ═══════════════════════════════════════════════════════════════════════════════
// NUMERIC CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Numeric divisor/offset converter
 * value = raw / divisor + offset
 *
 * @param {Object} opts
 * @param {number} [opts.divisor=1] - Divide raw by this
 * @param {number} [opts.offset=0] - Add after division
 * @param {number} [opts.multiplier=1] - Multiply raw before division
 * @param {number} [opts.precision=1] - Decimal places to round to
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function numeric(opts = {}) {
  const { divisor = 1, offset = 0, multiplier = 1, precision = 1 } = opts;
  return {
    fromDevice: (raw) => {
      if (raw == null || isNaN(raw)) return raw;
      const val = (raw * multiplier) / divisor + offset;
      return precision > 0 ? Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision) : Math.round(val);
    },
    toDevice: (val) => {
      if (val == null || isNaN(val)) return val;
      return Math.round((val - offset) * divisor / multiplier);
    },
  };
}

/**
 * Divide-only converter (common shortcut)
 * @param {number} divisor
 * @param {number} [precision=1]
 */
function divide(divisor, precision = 1) {
  return numeric({ divisor, precision });
}

/**
 * Multiply-only converter (reverse direction)
 * @param {number} multiplier
 */
function multiply(multiplier) {
  return numeric({ multiplier, precision: 0 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENUM CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enum mapping converter (numeric <-> string)
 *
 * @param {Object} map - { numericValue: stringValue, ... }
 * @param {string} [defaultVal] - Default for unknown values
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function enumMap(map, defaultVal) {
  // Build reverse map
  const reverse = {};
  for (const [k, v] of Object.entries(map)) {
    reverse[v] = isNaN(k) ? k : Number(k);
  }
  return {
    fromDevice: (raw) => {
      if (raw == null) return defaultVal;
      // Try numeric key first, then string key
      const numKey = Number(raw);
      if (map[numKey] !== undefined) return map[numKey];
      if (map[raw] !== undefined) return map[raw];
      return defaultVal !== undefined ? defaultVal : raw;
    },
    toDevice: (val) => {
      if (val == null) return val;
      if (reverse[val] !== undefined) return reverse[val];
      // If already a number and in the map keys, pass through
      if (typeof val === 'number' && map[val] !== undefined) return val;
      return val;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOLEAN CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Boolean coercion converter
 *
 * Truthy: true, 1, '1', 'on', 'open', 'yes'
 * Falsy:  false, 0, '0', 'off', 'closed', 'no', '', null, undefined
 *
 * @param {Object} [opts]
 * @param {*} [opts.trueValue=true] - Value to send for "on"
 * @param {*} [opts.falseValue=false] - Value to send for "off"
 * @param {boolean} [opts.invert=false] - Invert the boolean
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function boolean(opts = {}) {
  const { trueValue = true, falseValue = false, invert = false } = opts;
  const truthyValues = new Set([true, 1, '1', 'on', 'open', 'yes']);
  const falsyValues = new Set([false, 0, '0', 'off', 'closed', 'no', '', null, undefined]);

  return {
    fromDevice: (raw) => {
      let result;
      if (truthyValues.has(raw)) result = true;
      else if (falsyValues.has(raw)) result = false;
      else result = !!raw; // fallback coercion
      return invert ? !result : result;
    },
    toDevice: (val) => {
      let result;
      if (truthyValues.has(val)) result = trueValue;
      else if (falsyValues.has(val)) result = falseValue;
      else result = val ? trueValue : falseValue;
      return invert ? (result === trueValue ? falseValue : trueValue) : result;
    },
  };
}

/**
 * Inverted boolean (true = off, false = on)
 * Common for contact sensors where 0 = open, 1 = closed
 */
function invertedBoolean() {
  return boolean({ invert: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BITFIELD CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bitfield parser - extract individual bits from integer
 *
 * @param {number} bit - Bit position (0-based)
 * @returns {Function} (raw) => boolean
 */
function bitfield(bit) {
  return (raw) => {
    if (raw == null || isNaN(raw)) return false;
    return (Number(raw) & (1 << bit)) !== 0;
  };
}

/**
 * Parse multiple bits as a value
 *
 * @param {number} bitStart - Start bit position (0-based)
 * @param {number} bitCount - Number of bits
 * @returns {Function} (raw) => number
 */
function bits(bitStart, bitCount) {
  const mask = (1 << bitCount) - 1;
  return (raw) => {
    if (raw == null || isNaN(raw)) return 0;
    return (Number(raw) >> bitStart) & mask;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RANGE / CLAMP CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clamp value to range
 *
 * @param {number} min
 * @param {number} max
 * @returns {Function} (raw) => clamped number
 */
function clamp(min, max) {
  return (raw) => {
    if (raw == null || isNaN(raw)) return raw;
    return Math.min(max, Math.max(min, Number(raw)));
  };
}

/**
 * Normalize value from one range to another (0-1)
 *
 * @param {number} inMin
 * @param {number} inMax
 * @returns {Function} (raw) => 0.0 to 1.0
 */
function normalize(inMin, inMax) {
  const range = inMax - inMin;
  return (raw) => {
    if (raw == null || isNaN(raw)) return raw;
    return Math.max(0, Math.min(1, (Number(raw) - inMin) / range));
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVERT CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Position invert (100 - value)
 * For curtains where 0 = open, 100 = closed
 *
 * @param {number} [max=100] - Maximum value
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function positionInvert(max = 100) {
  return {
    fromDevice: (raw) => {
      if (raw == null || isNaN(raw)) return raw;
      return max - Number(raw);
    },
    toDevice: (val) => {
      if (val == null || isNaN(val)) return val;
      return max - Number(val);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUNDING CONVERTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Round to fixed decimal places
 *
 * @param {number} [precision=1] - Decimal places
 * @returns {Function} (raw) => rounded number
 */
function round(precision = 1) {
  const factor = Math.pow(10, precision);
  return (raw) => {
    if (raw == null || isNaN(raw)) return raw;
    return Math.round(Number(raw) * factor) / factor;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compose multiple transform functions (left to right pipeline)
 * Each function receives the output of the previous one.
 *
 * @param  {...Function} fns - Transform functions
 * @returns {Function} Composed transform
 */
function compose(...fns) {
  return (raw) => {
    let result = raw;
    for (const fn of fns) {
      if (typeof fn === 'function') {
        result = fn(result);
      } else if (fn && typeof fn.fromDevice === 'function') {
        result = fn.fromDevice(result);
      }
    }
    return result;
  };
}

/**
 * Wrap a transform function with a null guard
 * Returns null/undefined as-is without applying transform
 *
 * @param {Function} fn - Transform function
 * @returns {Function}
 */
function nullSafe(fn) {
  return (raw) => {
    if (raw == null) return raw;
    return fn(raw);
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-BUILT COMMON CONVERTERS (Z2M-inspired)
// ═══════════════════════════════════════════════════════════════════════════════

const common = {
  /** Temperature: raw / 10 -> -40 to 100 */
  temperature: numeric({ divisor: 10, precision: 1 }),

  /** Humidity: raw / 10 -> 0 to 100 */
  humidity: numeric({ divisor: 10, precision: 1 }),

  /** Humidity direct: 0-100 */
  humidityDirect: { fromDevice: (v) => v, toDevice: (v) => v },

  /** Formaldehyde: raw / 100 */
  formaldehyde: numeric({ divisor: 100, precision: 2 }),

  /** Power (W): raw / 10 */
  power: numeric({ divisor: 10, precision: 1 }),

  /** Current (A): raw / 1000 */
  current: numeric({ divisor: 1000, precision: 3 }),

  /** Voltage (V): raw / 10 */
  voltage: numeric({ divisor: 10, precision: 1 }),

  /** Energy (kWh): raw / 100 */
  energy: numeric({ divisor: 100, precision: 2 }),

  /** Distance (m): raw / 100 (cm -> m) */
  distance: numeric({ divisor: 100, precision: 2 }),

  /** Luminance (lux): direct */
  luminance: { fromDevice: (v) => v, toDevice: (v) => v },

  /** CO2 (ppm): direct */
  co2: { fromDevice: (v) => v, toDevice: (v) => v },

  /** Battery: direct 0-100 */
  battery: numeric({ divisor: 1, precision: 0 }),

  /** OnOff boolean */
  onoff: boolean(),

  /** Inverted onoff (for some garage doors) */
  onoffInverted: boolean({ invert: true }),

  /** Dim (0-1000 -> 0.0-1.0) */
  dim1000: numeric({ divisor: 1000, precision: 2 }),

  /** Dim (0-100 -> 0.0-1.0) */
  dim100: numeric({ divisor: 100, precision: 2 }),

  /** Cover position invert (0=open, 100=closed) */
  coverInverted: positionInvert(100),
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY (for named custom converters)
// ═══════════════════════════════════════════════════════════════════════════════

const _registry = new Map();

/**
 * Register a named converter for reuse
 * @param {string} name - Unique name
 * @param {Function|Object} converter - Transform function or {fromDevice, toDevice}
 */
function register(name, converter) {
  _registry.set(name, converter);
}

/**
 * Get a registered converter by name
 * @param {string} name
 * @returns {Function|Object|null}
 */
function get(name) {
  return _registry.get(name) || null;
}

/**
 * List all registered converter names
 * @returns {string[]}
 */
function list() {
  return Array.from(_registry.keys());
}

// Register all common converters
for (const [name, converter] of Object.entries(common)) {
  register(name, converter);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Z2M-INSPIRED ADVANCED CONVERTERS (v9.0.40)
// Ported from zigbee-herdsman-converters/src/lib/tuya.ts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scale converter - bidirectional linear range mapping
 * Maps value from range [inMin, inMax] to [outMin, outMax]
 *
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function scale(inMin, inMax, outMin, outMax) {
  const inRange = inMax - inMin;
  const outRange = outMax - outMin;
  return {
    fromDevice: (raw) => {
      if (raw == null || isNaN(raw)) return raw;
      return outMin + ((Number(raw) - inMin) / inRange) * outRange;
    },
    toDevice: (val) => {
      if (val == null || isNaN(val)) return val;
      return inMin + ((Number(val) - outMin) / outRange) * inRange;
    },
  };
}

/**
 * Lookup converter - bidirectional string <-> value mapping with fallback
 * Z2M pattern: tuya.valueConverter.lookup(map, fallbackValue)
 *
 * @param {Object} map - { key: value, ... } where key is from/to device, value is the other direction
 * @param {*} [fallback] - Fallback for unknown values
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function lookup(map, fallback) {
  const reverse = {};
  for (const [k, v] of Object.entries(map)) {
    reverse[v] = k;
  }
  return {
    fromDevice: (raw) => {
      if (raw == null) return fallback;
      if (map[raw] !== undefined) return map[raw];
      if (map[String(raw)] !== undefined) return map[String(raw)];
      return fallback !== undefined ? fallback : raw;
    },
    toDevice: (val) => {
      if (val == null) return fallback;
      if (reverse[val] !== undefined) return reverse[val];
      if (reverse[String(val)] !== undefined) return reverse[String(val)];
      return fallback !== undefined ? fallback : val;
    },
  };
}

/**
 * Local temperature calibration converter
 * Handles the 4096-based two's complement encoding used by many Tuya thermostats.
 * Z2M: tuya.valueConverter.localTemperatureCalibration
 *
 * Some thermostats use 4096-based offset: raw = 4096 + offset (for negative values)
 * Others use 256-based: raw = 256 + offset
 *
 * @param {Object} [opts]
 * @param {number} [opts.base=4096] - Two's complement base (4096 or 256)
 * @param {number} [opts.divisor=1] - Scale divisor (1 = integer, 10 = 0.1 precision)
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function localTemperatureCalibration(opts = {}) {
  const { base = 4096, divisor = 1 } = opts;
  return {
    fromDevice: (raw) => {
      if (raw == null || isNaN(raw)) return raw;
      let val = Number(raw);
      // Handle two's complement for negative values
      if (val > base / 2) val -= base;
      return Math.round((val / divisor) * 10) / 10;
    },
    toDevice: (val) => {
      if (val == null || isNaN(val)) return val;
      let raw = Math.round(Number(val) * divisor);
      if (raw < 0) raw += base;
      return raw;
    },
  };
}

/**
 * Phase variant converter for energy meters
 * Parses base64-encoded or raw buffer data containing voltage, current, and power.
 * Z2M: tuya.valueConverter.phaseVariant1/2/3/4
 *
 * @param {Object} [opts]
 * @param {number} [opts.voltageDivisor=10] - Voltage divisor
 * @param {number} [opts.currentDivisor=1000] - Current divisor
 * @param {number} [opts.powerDivisor=1] - Power divisor
 * @param {boolean} [opts.hasPower=true] - Whether power is included
 * @param {string} [opts.phase] - Phase suffix for per-phase outputs (e.g., 'L1', 'L2', 'L3')
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function phaseConverter(opts = {}) {
  const {
    voltageDivisor = 10,
    currentDivisor = 1000,
    powerDivisor = 1,
    hasPower = true,
    phase = null,
  } = opts;

  return {
    fromDevice: (raw) => {
      if (raw == null) return null;

      let buf;
      if (Buffer.isBuffer(raw)) {
        buf = raw;
      } else if (typeof raw === 'string') {
        // Base64 encoded
        try {
          buf = Buffer.from(raw, 'base64');
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }

      if (buf.length < 4) return null;

      // Parse voltage (bytes 0-1, big-endian)
      const voltage = buf.readUInt16BE(0) / voltageDivisor;

      // Parse current (bytes 2-3, big-endian)
      const current = buf.readUInt16BE(2) / currentDivisor;

      // Parse power (bytes 4-5, big-endian) if available
      let power = 0;
      if (hasPower && buf.length >= 6) {
        power = buf.readUInt16BE(4) / powerDivisor;
      }

      const suffix = phase ? `_${phase}` : '';
      return {
        [`voltage${suffix}`]: Math.round(voltage * 10) / 10,
        [`current${suffix}`]: Math.round(current * 1000) / 1000,
        [`power${suffix}`]: Math.round(power * 10) / 10,
      };
    },
    toDevice: () => null, // Read-only converter
  };
}

/**
 * Water consumption converter
 * Parses 8-byte Tuya water meter buffer where bytes 4-7 contain the total consumption
 * in liters, stored as uint32 big-endian, with divisor 1000 (m3).
 * Z2M: tuya.valueConverter.waterConsumption
 *
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function waterConsumption() {
  return {
    fromDevice: (raw) => {
      if (raw == null) return null;

      let buf;
      if (Buffer.isBuffer(raw)) {
        buf = raw;
      } else if (typeof raw === 'string') {
        try {
          buf = Buffer.from(raw, 'base64');
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }

      if (buf.length < 8) return null;

      // Bytes 4-7: total consumption in liters (uint32 BE)
      const totalLiters = buf.readUInt32BE(4);
      return Math.round((totalLiters / 1000) * 1000) / 1000; // Convert to m3
    },
    toDevice: () => null, // Read-only
  };
}

/**
 * Thermostat schedule converter for multi-period schedules
 * Parses/encodes Tuya thermostat schedule DPs with N transitions per day.
 * Z2M: tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(n)
 *
 * Schedule format: [count, [hour, minute, temperature], ...]
 * Temperature is stored as 2 bytes big-endian, divided by 10 for Celsius.
 *
 * @param {number} [transitionCount=4] - Number of transitions per day
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function thermostatSchedule(transitionCount = 4) {
  return {
    fromDevice: (raw) => {
      if (raw == null) return null;

      let buf;
      if (Buffer.isBuffer(raw)) {
        buf = raw;
      } else if (typeof raw === 'string') {
        try {
          buf = Buffer.from(raw, 'base64');
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }

      const transitions = [];
      for (let i = 0; i < transitionCount; i++) {
        const offset = i * 4;
        if (offset + 4 > buf.length) break;

        const hour = buf[offset];
        const minute = buf[offset + 1];
        const tempRaw = buf.readUInt16BE(offset + 2);
        const temperature = Math.round((tempRaw / 10) * 10) / 10;

        transitions.push({ hour, minute, temperature });
      }

      return transitions;
    },
    toDevice: (transitions) => {
      if (!Array.isArray(transitions)) return null;

      const buf = Buffer.alloc(transitionCount * 4, 0);
      for (let i = 0; i < Math.min(transitions.length, transitionCount); i++) {
        const offset = i * 4;
        const { hour = 0, minute = 0, temperature = 20 } = transitions[i];

        buf[offset] = hour;
        buf[offset + 1] = minute;
        buf.writeUInt16BE(Math.round(temperature * 10), offset + 2);
      }

      return buf;
    },
  };
}

/**
 * Threshold parser/encoder for circuit breaker protection settings
 * Parses/encodes 4-byte threshold blocks: [id, enabled_bool, value_high, value_low]
 * Z2M: tuya.valueConverter.threshold / threshold_2 / threshold_3
 *
 * @param {Object} thresholdDefs - Map of threshold ID to { name, divisor?, min?, max? }
 * @returns {{ fromDevice: Function, toDevice: Function }}
 */
function thresholdParser(thresholdDefs) {
  return {
    fromDevice: (raw) => {
      if (raw == null) return null;

      let buf;
      if (Buffer.isBuffer(raw)) {
        buf = raw;
      } else if (typeof raw === 'string') {
        try {
          buf = Buffer.from(raw, 'base64');
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }

      const result = {};
      for (let i = 0; i + 3 < buf.length; i += 4) {
        const id = buf[i];
        const enabled = buf[i + 1] === 1;
        const value = (buf[i + 2] << 8) | buf[i + 3];

        const def = thresholdDefs[id];
        if (def) {
          const divisor = def.divisor || 1;
          result[def.name] = {
            enabled,
            value: Math.round((value / divisor) * 10) / 10,
          };
        }
      }

      return result;
    },
    toDevice: (values) => {
      if (values == null || typeof values !== 'object') return null;

      const entries = Object.entries(values);
      const buf = Buffer.alloc(entries.length * 4, 0);

      for (let i = 0; i < entries.length; i++) {
        const offset = i * 4;
        const [name, { enabled = false, value = 0 }] = entries[i];

        // Find threshold ID from name
        const def = Object.entries(thresholdDefs).find(([, d]) => d.name === name);
        if (!def) continue;

        const [id, d] = def;
        const divisor = d.divisor || 1;

        buf[offset] = Number(id);
        buf[offset + 1] = enabled ? 1 : 0;
        buf.writeUInt16BE(Math.round(value * divisor), offset + 2);
      }

      return buf;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Z2M-STYLE PRESET CONVERTERS (ready-to-use for common Tuya devices)
// ═══════════════════════════════════════════════════════════════════════════════

const presetConverters = {
  /** Local temperature calibration (4096-based, integer degrees) */
  localTempCalibration: localTemperatureCalibration({ base: 4096, divisor: 1 }),

  /** Local temperature calibration (256-based, integer degrees) */
  localTempCalibration256: localTemperatureCalibration({ base: 256, divisor: 1 }),

  /** Local temperature calibration (4096-based, 0.1 degree precision) */
  localTempCalibration10: localTemperatureCalibration({ base: 4096, divisor: 10 }),

  /** Phase variant 1: voltage + current only */
  phaseV1: phaseConverter({ hasPower: false }),

  /** Phase variant 2: voltage + current + power */
  phaseV2: phaseConverter({ hasPower: true }),

  /** Phase variant per-phase L1 */
  phaseL1: phaseConverter({ hasPower: true, phase: 'L1' }),

  /** Phase variant per-phase L2 */
  phaseL2: phaseConverter({ hasPower: true, phase: 'L2' }),

  /** Phase variant per-phase L3 */
  phaseL3: phaseConverter({ hasPower: true, phase: 'L3' }),

  /** Water consumption (8-byte buffer, liters -> m3) */
  waterConsumption: waterConsumption(),

  /** Thermostat schedule 4 transitions/day */
  schedule4: thermostatSchedule(4),

  /** Thermostat schedule 6 transitions/day */
  schedule6: thermostatSchedule(6),

  /** Power on behavior: off(0)/on(1)/previous(2) */
  powerOnBehavior: enumMap({ 0: 'off', 1: 'on', 2: 'previous' }, 'previous'),

  /** Switch type: momentary(0)/toggle(1)/state(2) */
  switchType: enumMap({ 0: 'momentary', 1: 'toggle', 2: 'state' }, 'state'),

  /** Backlight mode: off(0)/normal(1)/inverted(2) */
  backlightModeOffNormalInverted: enumMap({ 0: 'off', 1: 'normal', 2: 'inverted' }, 'off'),

  /** Backlight mode: off(0)/low(1)/medium(2)/high(3) */
  backlightModeOffLowMediumHigh: enumMap({ 0: 'off', 1: 'low', 2: 'medium', 3: 'high' }, 'off'),

  /** Temperature unit: celsius(0)/fahrenheit(1) */
  temperatureUnit: enumMap({ 0: 'celsius', 1: 'fahrenheit' }, 'celsius'),

  /** Battery state: low(0)/medium(1)/high(2) */
  batteryState: enumMap({ 0: 'low', 1: 'medium', 2: 'high' }, 'medium'),

  /** Sensitivity: low(0)/middle(1)/high(2) */
  sensitivity: enumMap({ 0: 'low', 1: 'middle', 2: 'high' }, 'middle'),

  /** Self-test result: checking(0)/success(1)/failure(2)/others(3) */
  selfTestResult: enumMap({
    0: 'checking', 1: 'success', 2: 'failure', 3: 'others',
  }, 'checking'),

  /** Alarm mode: arm(0)/silent(1)/disarm(2) */
  alarmMode: enumMap({ 0: 'arm', 1: 'silent', 2: 'disarm' }, 'disarm'),

  /** Cover position (respecting invert_cover option) */
  coverPosition: {
    fromDevice: (raw, opts) => {
      if (raw == null || isNaN(raw)) return raw;
      let val = Number(raw);
      if (opts && opts.invert_cover) val = 100 - val;
      return val;
    },
    toDevice: (val, opts) => {
      if (val == null || isNaN(val)) return val;
      let raw = Number(val);
      if (opts && opts.invert_cover) raw = 100 - raw;
      return raw;
    },
  },

  /** Cover position inverted (Z2M: tuya.valueConverter.coverPositionInverted) */
  coverPositionInverted: {
    fromDevice: (raw) => {
      if (raw == null || isNaN(raw)) return raw;
      return 100 - Number(raw);
    },
    toDevice: (val) => {
      if (val == null || isNaN(val)) return val;
      return 100 - Number(val);
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORM RESOLVER (backward compatibility bridge)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a transform value to a callable function.
 *
 * Supports three patterns:
 *   1. Plain function: (v) => v === 1              (legacy inline transforms)
 *   2. Converter object: { fromDevice, toDevice }   (ValueConverterRegistry)
 *   3. String name: 'boolean'                        (future: registry lookup)
 *
 * @param {*} transform - The transform to resolve
 * @param {string} [direction='fromDevice'] - 'fromDevice' or 'toDevice'
 * @returns {Function|null} Callable transform function, or null
 */
function resolveTransform(transform, direction = 'fromDevice') {
  if (!transform) return null;
  if (typeof transform === 'function') return transform;
  if (typeof transform === 'object' && typeof transform[direction] === 'function') {
    return transform[direction];
  }
  if (typeof transform === 'string') {
    const named = get(transform);
    if (named) return resolveTransform(named, direction);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER PRESET CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════════

for (const [name, converter] of Object.entries(presetConverters)) {
  register(name, converter);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core converters
  numeric,
  divide,
  multiply,
  enumMap,
  boolean,
  invertedBoolean,
  bitfield,
  bits,
  clamp,
  normalize,
  positionInvert,
  round,

  // Z2M-inspired advanced converters (v9.0.40)
  scale,
  lookup,
  localTemperatureCalibration,
  phaseConverter,
  waterConsumption,
  thermostatSchedule,
  thresholdParser,

  // Utilities
  compose,
  nullSafe,
  resolveTransform,

  // Registry
  register,
  get,
  list,

  // Pre-built
  common,
  presetConverters,

  // Backward compat alias
  converters: {
    numeric,
    divide,
    multiply,
    enumMap,
    boolean,
    invertedBoolean,
    bitfield,
    bits,
    clamp,
    normalize,
    positionInvert,
    round,
    // Z2M-inspired
    scale,
    lookup,
    localTemperatureCalibration,
    phaseConverter,
    waterConsumption,
    thermostatSchedule,
    thresholdParser,
    // Utilities
    compose,
    nullSafe,
    resolveTransform,
    common,
    presetConverters,
    register,
    get,
    list,
  },
};
