'use strict';

/**
 * Bitmap Multi-Field Parser - PROTOCOL #3
 *
 * Parses Tuya bitmap/byte-field DPs into individual boolean/numeric sub-fields.
 * Many Tuya devices pack multiple settings into a single DP as a bitmap:
 *   e.g. DP 104 byte value 0x15 = bits: [motor_direction=1, calibration=0, led_indicator=1, sound=0, child_lock=1]
 *
 * Features:
 * - Bit-level extraction from raw bytes
 * - Configurable field definitions per DP
 * - Value reconstruction for write-back
 * - Field grouping and masking
 * - Support for multi-byte bitmaps (up to 32 bits)
 *
 * @version 9.1.0
 */

class BitmapMultiFieldParser {
  /**
   * @param {Object} fieldDefs - Map of DP ID -> field definitions
   *   Each field definition: { name, bit, mask, size, type, defaultValue }
   *   - name: Human-readable field name
   *   - bit: Starting bit position (0 = LSB)
   *   - mask: Bitmask (optional, auto-calculated from size if omitted)
   *   - size: Number of bits (1 for boolean, 2-8 for small enums/numbers)
   *   - type: 'boolean' | 'enum' | 'number' (default: 'boolean')
   *   - defaultValue: Default value when field is absent
   */
  constructor(fieldDefs = {}) {
    this.fieldDefs = new Map();
    for (const [dpId, fields] of Object.entries(fieldDefs)) {
      this.fieldDefs.set(Number(dpId), this._normalizeFields(fields));
    }
  }

  /**
   * Register field definitions for a DP
   * @param {number} dpId
   * @param {Array<Object>} fields
   */
  registerDP(dpId, fields) {
    this.fieldDefs.set(Number(dpId), this._normalizeFields(fields));
  }

  /**
   * Normalize field definitions - auto-calculate masks from bit+size
   */
  _normalizeFields(fields) {
    if (!Array.isArray(fields)) return [];

    return fields.map(f => {
      const size = f.size || 1;
      const bit = f.bit || 0;
      const mask = f.mask !== undefined ? f.mask : ((1 << size) - 1) << bit;

      return {
        name: f.name || `field_${bit}`,
        bit,
        mask,
        size,
        type: f.type || 'boolean',
        defaultValue: f.defaultValue !== undefined ? f.defaultValue : (f.type === 'boolean' ? false : 0),
        label: f.label || f.name || `Bit ${bit}`
      };
    });
  }

  /**
   * Parse a bitmap value into individual fields
   * @param {number} dpId - Data point ID
   * @param {number} rawValue - Raw bitmap value (0-4294967295 for up to 32 bits)
   * @returns {Object|null} - Parsed fields as { fieldName: value, ... } or null if DP not registered
   */
  parse(dpId, rawValue) {
    const fields = this.fieldDefs.get(Number(dpId));
    if (!fields || fields.length === 0) return null;

    const value = Number(rawValue) >>> 0; // Ensure unsigned 32-bit
    const result = {};

    for (const field of fields) {
      const extracted = (value & field.mask) >>> field.bit;

      switch (field.type) {
      case 'boolean':
        result[field.name] = extracted !== 0;
        break;
      case 'enum':
        result[field.name] = extracted;
        break;
      case 'number':
        result[field.name] = extracted;
        break;
      default:
        result[field.name] = extracted;
      }
    }

    return result;
  }

  /**
   * Reconstruct a bitmap value from individual field values
   * @param {number} dpId - Data point ID
   * @param {Object} fieldValues - { fieldName: value, ... }
   * @returns {number|null} - Reconstructed bitmap value, or null if DP not registered
   */
  construct(dpId, fieldValues) {
    const fields = this.fieldDefs.get(Number(dpId));
    if (!fields || fields.length === 0) return null;

    let bitmap = 0;

    for (const field of fields) {
      let val = fieldValues[field.name];

      // Use default if not provided
      if (val === undefined) {
        val = field.defaultValue;
      }

      // Convert boolean to number
      if (field.type === 'boolean') {
        val = val ? 1 : 0;
      }

      // Validate range
      const maxVal = (1 << field.size) - 1;
      val = Math.max(0, Math.min(maxVal, Number(val)));

      // Set bits
      bitmap |= (val << field.bit) & field.mask;
    }

    return bitmap >>> 0; // Ensure unsigned
  }

  /**
   * Update a single field in a bitmap
   * @param {number} dpId
   * @param {number} currentBitmap - Current bitmap value
   * @param {string} fieldName - Name of field to change
   * @param {*} value - New value
   * @returns {number|null} - Updated bitmap
   */
  updateField(dpId, currentBitmap, fieldName, value) {
    const fields = this.fieldDefs.get(Number(dpId));
    if (!fields) return null;

    const field = fields.find(f => f.name === fieldName);
    if (!field) return null;

    let bitmap = Number(currentBitmap) >>> 0;

    // Clear the field bits
    bitmap &= ~field.mask;

    // Set new value
    let val = value;
    if (field.type === 'boolean') {
      val = value ? 1 : 0;
    }

    const maxVal = (1 << field.size) - 1;
    val = Math.max(0, Math.min(maxVal, Number(val)));

    bitmap |= (val << field.bit) & field.mask;
    return bitmap >>> 0;
  }

  /**
   * Get human-readable description of a bitmap
   * @param {number} dpId
   * @param {number} rawValue
   * @returns {Array<Object>} - Array of { name, value, bit, label, binary }
   */
  describe(dpId, rawValue) {
    const fields = this.fieldDefs.get(Number(dpId));
    if (!fields || fields.length === 0) return [];

    const value = Number(rawValue) >>> 0;
    return fields.map(field => ({
      name: field.name,
      label: field.label,
      bit: field.bit,
      size: field.size,
      type: field.type,
      value: (value & field.mask) >>> field.bit,
      binary: ((value & field.mask) >>> field.bit).toString(2).padStart(field.size, '0'),
      boolean: field.type === 'boolean' ? ((value & field.mask) >>> field.bit) !== 0 : undefined
    }));
  }

  /**
   * Register common Tuya bitmap DPs
   * Pre-configured for well-known Tuya bitmap patterns
   */
  static createCommonParser() {
    const parser = new BitmapMultiFieldParser();

    // DP 104 - Switch settings bitmap (common across many Tuya switches)
    parser.registerDP(104, [
      { name: 'motor_direction', bit: 0, size: 1, type: 'boolean', label: 'Motor Direction' },
      { name: 'calibration', bit: 1, size: 1, type: 'boolean', label: 'Calibration' },
      { name: 'led_indicator', bit: 2, size: 1, type: 'boolean', label: 'LED Indicator' },
      { name: 'sound', bit: 3, size: 1, type: 'boolean', label: 'Sound' },
      { name: 'child_lock', bit: 4, size: 1, type: 'boolean', label: 'Child Lock' }
    ]);

    // DP 102 - Thermostat mode bitmap
    parser.registerDP(102, [
      { name: 'auto_mode', bit: 0, size: 1, type: 'boolean', label: 'Auto Mode' },
      { name: 'manual_mode', bit: 1, size: 1, type: 'boolean', label: 'Manual Mode' },
      { name: 'comfort_mode', bit: 2, size: 1, type: 'boolean', label: 'Comfort Mode' },
      { name: 'eco_mode', bit: 3, size: 1, type: 'boolean', label: 'Eco Mode' },
      { name: 'boost_mode', bit: 4, size: 1, type: 'boolean', label: 'Boost Mode' }
    ]);

    // DP 107 - Sensor configuration bitmap
    parser.registerDP(107, [
      { name: 'pir_enabled', bit: 0, size: 1, type: 'boolean', label: 'PIR Sensor' },
      { name: 'microwave_enabled', bit: 1, size: 1, type: 'boolean', label: 'Microwave Sensor' },
      { name: 'light_sensor', bit: 2, size: 1, type: 'boolean', label: 'Light Sensor' },
      { name: 'temperature_sensor', bit: 3, size: 1, type: 'boolean', label: 'Temperature Sensor' },
      { name: 'humidity_sensor', bit: 4, size: 1, type: 'boolean', label: 'Humidity Sensor' },
      { name: 'multi_sense_mode', bit: 5, size: 2, type: 'enum', label: 'Multi-Sense Mode', defaultValue: 0 }
    ]);

    // DP 16 - Cover/blind position settings bitmap
    parser.registerDP(16, [
      { name: 'calibration', bit: 0, size: 1, type: 'boolean', label: 'Calibration' },
      { name: 'motor_reversal', bit: 1, size: 1, type: 'boolean', label: 'Motor Reversal' },
      { name: 'position_report', bit: 2, size: 1, type: 'boolean', label: 'Position Report' },
      { name: 'tilt_control', bit: 3, size: 1, type: 'boolean', label: 'Tilt Control' },
      { name: 'slat_angle', bit: 4, size: 4, type: 'number', label: 'Slat Angle', defaultValue: 0 }
    ]);

    return parser;
  }
}

module.exports = BitmapMultiFieldParser;
