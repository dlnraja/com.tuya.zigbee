'use strict';

/**
 * ValueConverterRegistry - Central registry of value converters
 *
 * Inspired by Z2M (zigbee-herdsman-converters) converter patterns.
 * Provides reusable value transformation functions for all drivers.
 *
 * Converter types:
 *   - numeric:   raw / divisor + offset
 *   - enum:      numeric <-> string mapping
 *   - boolean:   truthy/falsy coercion with configurable thresholds
 *   - bitfield:  parse individual bits from integer
 *   - clamp:     restrict value to min/max range
 *   - invert:    100 - value (for curtains with inverted position)
 *   - round:     decimal precision control
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
    compose,
    nullSafe,
    resolveTransform,
    common,
    register,
    get,
    list,
  },
};
