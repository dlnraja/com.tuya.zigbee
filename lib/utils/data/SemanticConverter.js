'use strict';

/**
 * SemanticConverter - v5.5.397
 * Convert raw sensor values to semantic units and vice versa
 * Handles: Temperature, humidity, battery, power, illuminance, etc.
 */

// Conversion definitions: { divisor, unit, min?, max?, precision? }
const CONVERSIONS = {
  // Temperature
  'temp': { divisor: 1, unit: '°C', precision: 1 },
  'temp_div10': { divisor: 10, unit: '°C', precision: 1 },
  'temp_div100': { divisor: 100, unit: '°C', precision: 2 },
  'temp_f': { divisor: 1, unit: '°F', precision: 1 },
  'temp_f_div10': { divisor: 10, unit: '°F', precision: 1 },
  'temp_offset_40': { divisor: 1, unit: '°C', offset: -40, precision: 1 },

  // Humidity
  'humidity': { divisor: 1, unit: '%', min: 0, max: 100, precision: 0 },
  'humidity_div10': { divisor: 10, unit: '%', min: 0, max: 100, precision: 1 },
  'humidity_div100': { divisor: 100, unit: '%', min: 0, max: 100, precision: 2 },

  // Battery
  'battery': { divisor: 1, unit: '%', min: 0, max: 100, precision: 0 },
  'battery_div2': { divisor: 0.5, unit: '%', min: 0, max: 100, precision: 0 },
  'battery_mv': { divisor: 1, unit: 'mV', precision: 0 },
  'battery_mv_to_pct': { divisor: 1, unit: '%', min: 0, max: 100, precision: 0, custom: 'battery_mv' },

  // Power & Energy
  'power': { divisor: 1, unit: 'W', precision: 1 },
  'power_div10': { divisor: 10, unit: 'W', precision: 1 },
  'power_div100': { divisor: 100, unit: 'W', precision: 2 },
  'energy': { divisor: 1, unit: 'kWh', precision: 2 },
  'energy_div100': { divisor: 100, unit: 'kWh', precision: 2 },
  'energy_div1000': { divisor: 1000, unit: 'kWh', precision: 3 },

  // Voltage & Current
  'voltage': { divisor: 1, unit: 'V', precision: 1 },
  'voltage_div10': { divisor: 10, unit: 'V', precision: 1 },
  'voltage_div100': { divisor: 100, unit: 'V', precision: 2 },
  'current': { divisor: 1, unit: 'A', precision: 2 },
  'current_ma': { divisor: 1, unit: 'mA', precision: 0 },
  'current_div1000': { divisor: 1000, unit: 'A', precision: 3 },

  // Illuminance
  'lux': { divisor: 1, unit: 'lx', precision: 0 },
  'lux_div10': { divisor: 10, unit: 'lx', precision: 1 },
  'illuminance_pct': { divisor: 1, unit: '%', min: 0, max: 100, precision: 0 },

  // Distance & Motion
  'distance_cm': { divisor: 1, unit: 'cm', precision: 0 },
  'distance_m': { divisor: 100, unit: 'm', precision: 2 },
  'distance_mm': { divisor: 1, unit: 'mm', precision: 0 },

  // Pressure
  'pressure': { divisor: 1, unit: 'hPa', precision: 1 },
  'pressure_div100': { divisor: 100, unit: 'hPa', precision: 2 },
  'pressure_kpa': { divisor: 1, unit: 'kPa', precision: 2 },

  // Air Quality
  'co2': { divisor: 1, unit: 'ppm', precision: 0 },
  'co2_div10': { divisor: 10, unit: 'ppm', precision: 1 },
  'voc': { divisor: 1, unit: 'ppb', precision: 0 },
  'pm25': { divisor: 1, unit: 'µg/m³', precision: 0 },
  'formaldehyde': { divisor: 100, unit: 'mg/m³', precision: 2 },

  // Percentage
  'percent': { divisor: 1, unit: '%', min: 0, max: 100, precision: 0 },
  'percent_div10': { divisor: 10, unit: '%', min: 0, max: 100, precision: 1 },
  'percent_invert': { divisor: 1, unit: '%', min: 0, max: 100, precision: 0, invert: true },
  'dim': { divisor: 2.54, unit: '%', min: 0, max: 100, precision: 0 }, // 0-254 to 0-100

  // Time
  'seconds': { divisor: 1, unit: 's', precision: 0 },
  'minutes': { divisor: 1, unit: 'min', precision: 0 },
  'seconds_to_min': { divisor: 60, unit: 'min', precision: 1 },

  // Flow
  'flow_lpm': { divisor: 1, unit: 'L/min', precision: 2 },
  'volume_l': { divisor: 1, unit: 'L', precision: 2 },
  'volume_ml': { divisor: 1, unit: 'mL', precision: 0 },

  // Boolean / State
  'bool': { divisor: 1, unit: '', precision: 0, boolean: true },
  'bool_invert': { divisor: 1, unit: '', precision: 0, boolean: true, invert: true },
  'alarm': { divisor: 1, unit: '', precision: 0, boolean: true },

  // Identity (no conversion)
  'raw': { divisor: 1, unit: '', precision: 0 },
  'enum': { divisor: 1, unit: '', precision: 0 }
};

class SemanticConverter {
  /**
   * Convert raw value to semantic value
   * @param {number} raw - Raw value from device
   * @param {string} conversion - Conversion name
   * @returns {Object} - { value, unit, raw, conversion }
   */
  static convert(raw, conversion) {
    const conv = CONVERSIONS[conversion];

    if (!conv) {
      return { value: raw, unit: '', raw, conversion };
    }

    let value;

    // Handle boolean types
    if (conv.boolean) {
      value = conv.invert ? !raw : !!raw;
      return { value, unit: conv.unit, raw, conversion };
    }

    // Handle custom conversions
    if (conv.custom === 'battery_mv') {
      // Convert battery mV to percentage (typical 2.4V-3.2V range)
      value = this._batteryMvToPercent(raw);
    } else {
      // Standard division
      value = raw / conv.divisor;

      // Apply offset if present
      if (conv.offset !== undefined) {
        value += conv.offset;
      }

      // Invert if needed
      if (conv.invert) {
        value = 100 - value;
      }
    }

    // Apply min/max bounds
    if (conv.min !== undefined) value = Math.max(conv.min, value);
    if (conv.max !== undefined) value = Math.min(conv.max, value);

    // Round to precision
    if (conv.precision !== undefined) {
      value = Number(value.toFixed(conv.precision));
    }

    return {
      value,
      unit: conv.unit,
      raw,
      conversion
    };
  }

  /**
   * Convert semantic value back to raw value
   * @param {number} value - Semantic value
   * @param {string} conversion - Conversion name
   * @returns {number} - Raw value for device
   */
  static toRaw(value, conversion) {
    const conv = CONVERSIONS[conversion];

    if (!conv) {
      return Math.round(value);
    }

    // Handle boolean
    if (conv.boolean) {
      const boolVal = conv.invert ? !value : !!value;
      return boolVal ? 1 : 0;
    }

    let raw = value;

    // Reverse invert
    if (conv.invert) {
      raw = 100 - raw;
    }

    // Reverse offset
    if (conv.offset !== undefined) {
      raw -= conv.offset;
    }

    // Reverse division (multiply)
    raw *= conv.divisor;

    return Math.round(raw);
  }

  /**
   * Convert battery millivolts to percentage
   * @private
   */
  static _batteryMvToPercent(mv) {
    // Typical battery voltage range: 2400mV (0%) to 3200mV (100%)
    const min = 2400;
    const max = 3200;
    const pct = ((mv - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  /**
   * Get unit for a conversion
   * @param {string} conversion - Conversion name
   * @returns {string} - Unit string
   */
  static getUnit(conversion) {
    return CONVERSIONS[conversion]?.unit || '';
  }

  /**
   * Check if conversion exists
   * @param {string} conversion - Conversion name
   * @returns {boolean}
   */
  static hasConversion(conversion) {
    return !!CONVERSIONS[conversion];
  }

  /**
   * Get all conversion names
   * @returns {string[]}
   */
  static getConversionNames() {
    return Object.keys(CONVERSIONS);
  }

  /**
   * Add custom conversion
   * @param {string} name - Conversion name
   * @param {Object} config - Conversion config
   */
  static addConversion(name, config) {
    CONVERSIONS[name] = config;
  }

  /**
   * Format value with unit for display
   * @param {number} raw - Raw value
   * @param {string} conversion - Conversion name
   * @returns {string} - Formatted string like "21.5 °C"
   */
  static format(raw, conversion) {
    const { value, unit } = this.convert(raw, conversion);
    return unit ? `${value} ${unit}` : String(value);
  }

  /**
   * Detect likely conversion based on capability name
   * @param {string} capability - Homey capability name
   * @returns {string|null} - Suggested conversion
   */
  static detectConversion(capability) {
    const mappings = {
      'measure_temperature': 'temp_div10',
      'measure_humidity': 'humidity',
      'measure_battery': 'battery',
      'measure_power': 'power_div10',
      'meter_power': 'energy_div100',
      'measure_voltage': 'voltage_div10',
      'measure_current': 'current_div1000',
      'measure_luminance': 'lux',
      'measure_pressure': 'pressure_div100',
      'measure_co2': 'co2',
      'dim': 'dim',
      'windowcoverings_set': 'percent_invert',
      'alarm_motion': 'bool',
      'alarm_contact': 'bool',
      'alarm_smoke': 'bool',
      'alarm_water': 'bool',
      'onoff': 'bool'
    };

    return mappings[capability] || null;
  }

  /**
   * Batch convert multiple values
   * @param {Object} rawValues - { key: rawValue }
   * @param {Object} conversions - { key: conversionName }
   * @returns {Object} - { key: { value, unit } }
   */
  static convertBatch(rawValues, conversions) {
    const result = {};
    for (const [key, raw] of Object.entries(rawValues)) {
      const conv = conversions[key];
      result[key] = conv ? this.convert(raw, conv) : { value: raw, unit: '' };
    }
    return result;
  }
}

module.exports = SemanticConverter;
module.exports.CONVERSIONS = CONVERSIONS;
