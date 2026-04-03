'use strict';

/**
 * AdaptiveDataParser - Universal data type handler
 * v5.3.62: Auto-adapts to ANY data format (raw, string, buffer, object, etc.)
 *
 * Handles:
 * - Tuya DP values (all types: bool, value, enum, string, raw, bitmap)
 * - ZCL attribute reports
 * - Raw Zigbee frames
 * - JSON strings
 * - Buffer data
 * - Any nested or unusual format
 */

class AdaptiveDataParser {

  /**
   * Parse ANY data into a normalized format
   * @param {any} data - Raw data in any format
   * @param {string} context - Context hint (e.g., 'tuya_dp', 'zcl', 'temperature')
   * @returns {Object} Normalized data { value, type, raw, parsed }
   */
  static parse(data, context = 'unknown') {
    const result = {
      value: null,
      type: 'unknown',
      raw: data,
      parsed: false,
      context: context
    };

    try {
      // Null/undefined
      if (data === null || data === undefined) {
        result.type = 'null';
        result.value = null;
        result.parsed = true;
        return result;
      }

      // Already a number
      if (typeof data === 'number') {
        result.type = 'number';
        result.value = data;
        result.parsed = true;
        return result;
      }

      // Boolean
      if (typeof data === 'boolean') {
        result.type = 'boolean';
        result.value = data;
        result.parsed = true;
        return result;
      }

      // String - try to parse
      if (typeof data === 'string') {
        return this._parseString(data, result);
      }

      // Buffer
      if (Buffer.isBuffer(data)) {
        return this._parseBuffer(data, result, context);
      }

      // Array
      if (Array.isArray(data)) {
        return this._parseArray(data, result, context);
      }

      // Object
      if (typeof data === 'object') {
        return this._parseObject(data, result, context);
      }

      // Fallback
      result.value = data;
      result.type = typeof data;
      result.parsed = true;
      return result;

    } catch (err) {
      result.error = err.message;
      return result;
    }
  }

  /**
   * Parse string data
   */
  static _parseString(data, result) {
    result.type = 'string';

    // Try JSON
    if ((data.startsWith('{') && data.endsWith('}')) ||
      (data.startsWith('[') && data.endsWith(']'))) {
      try {
        result.value = JSON.parse(data);
        result.type = 'json';
        result.parsed = true;
        return result;
      } catch (e) {
        // Not valid JSON
      }
    }

    // Try number
    const num = parseFloat(data);
    if (!isNaN(num) && isFinite(num)) {
      result.value = num;
      result.type = 'number';
      result.parsed = true;
      return result;
    }

    // Try hex string (e.g., "0x1A2B")
    if (data.startsWith('0x') || data.startsWith('0X')) {
      const hexNum = parseInt(data, 16);
      if (!isNaN(hexNum)) {
        result.value = hexNum;
        result.type = 'hex';
        result.parsed = true;
        return result;
      }
    }

    // Try boolean strings
    const lowerData = data.toLowerCase().trim();
    if (lowerData === 'true' || lowerData === '1' || lowerData === 'on' || lowerData === 'yes') {
      result.value = true;
      result.type = 'boolean';
      result.parsed = true;
      return result;
    }
    if (lowerData === 'false' || lowerData === '0' || lowerData === 'off' || lowerData === 'no') {
      result.value = false;
      result.type = 'boolean';
      result.parsed = true;
      return result;
    }

    // Keep as string
    result.value = data;
    result.parsed = true;
    return result;
  }

  /**
   * Parse buffer data based on context
   */
  static _parseBuffer(buffer, result, context) {
    result.type = 'buffer';
    result.bufferLength = buffer.length;
    result.hex = buffer.toString('hex');

    // Empty buffer
    if (buffer.length === 0) {
      result.value = null;
      result.parsed = true;
      return result;
    }

    // Single byte - boolean or enum
    if (buffer.length === 1) {
      const byte = buffer.readUInt8(0);
      if (context.includes('bool') || context.includes('onoff') || context.includes('alarm')) {
        result.value = byte === 1;
        result.type = 'boolean';
      } else {
        result.value = byte;
        result.type = 'uint8';
      }
      result.parsed = true;
      return result;
    }

    // 2 bytes - could be int16 or uint16
    if (buffer.length === 2) {
      // Temperature/humidity context - signed
      if (context.includes('temp') || context.includes('humid')) {
        result.value = buffer.readInt16BE(0);
        result.type = 'int16';
      } else {
        result.value = buffer.readUInt16BE(0);
        result.type = 'uint16';
      }
      result.parsed = true;
      return result;
    }

    // 4 bytes - typically uint32 or int32
    if (buffer.length === 4) {
      // Check if it could be a signed value
      const unsigned = buffer.readUInt32BE(0);
      const signed = buffer.readInt32BE(0);

      // Use signed if the value seems like it could be negative
      if (context.includes('temp') && unsigned > 0x7FFFFFFF) {
        result.value = signed;
        result.type = 'int32';
      } else {
        result.value = unsigned;
        result.type = 'uint32';
      }
      result.parsed = true;
      return result;
    }

    // Larger buffer - try to parse as Tuya DP frame
    if (buffer.length >= 4 && context.includes('tuya')) {
      const parsed = this._parseTuyaDPBuffer(buffer);
      if (parsed) {
        result.value = parsed;
        result.type = 'tuya_dp';
        result.parsed = true;
        return result;
      }
    }

    // Try UTF-8 string
    const str = buffer.toString('utf8');
    if (this._isPrintableString(str)) {
      result.value = str;
      result.type = 'string';
      result.parsed = true;
      return result;
    }

    // Return as array of bytes
    result.value = Array.from(buffer);
    result.type = 'byte_array';
    result.parsed = true;
    return result;
  }

  /**
   * Parse array data
   */
  static _parseArray(data, result, context) {
    result.type = 'array';

    // Array of bytes (numbers 0-255)
    if (data.every(v => typeof v === 'number' && v >= 0 && v <= 255)) {
      // Convert to buffer and re-parse
      const buffer = Buffer.from(data);
      return this._parseBuffer(buffer, result, context);
    }

    // Array of datapoints
    if (data.length > 0 && data[0] && (data[0].dp !== undefined || data[0].dpId !== undefined)) {
      result.value = data.map(dp => this._normalizeDPObject(dp));
      result.type = 'datapoint_array';
      result.parsed = true;
      return result;
    }

    // Generic array
    result.value = data;
    result.parsed = true;
    return result;
  }

  /**
   * Parse object data
   */
  static _parseObject(data, result, context) {
    result.type = 'object';

    // Tuya DP object
    if (data.dp !== undefined || data.dpId !== undefined || data.datapoint !== undefined) {
      result.value = this._normalizeDPObject(data);
      result.type = 'datapoint';
      result.parsed = true;
      return result;
    }

    // ZCL report
    if (data.measuredValue !== undefined) {
      result.value = data.measuredValue;
      result.type = 'zcl_measured';
      result.parsed = true;
      return result;
    }

    // Buffer-like object
    if (data.type === 'Buffer' && Array.isArray(data.data)) {
      const buffer = Buffer.from(data.data);
      return this._parseBuffer(buffer, result, context);
    }

    // Datapoints array inside object
    if (data.datapoints && Array.isArray(data.datapoints)) {
      result.value = data.datapoints.map(dp => this._normalizeDPObject(dp));
      result.type = 'datapoint_array';
      result.parsed = true;
      return result;
    }

    // dpValues buffer
    if (data.dpValues && Buffer.isBuffer(data.dpValues)) {
      const parsed = this._parseTuyaDPBuffer(data.dpValues);
      if (parsed) {
        result.value = parsed;
        result.type = 'tuya_dp_buffer';
        result.parsed = true;
        return result;
      }
    }

    // Generic object
    result.value = data;
    result.parsed = true;
    return result;
  }

  /**
   * Normalize a DP object to standard format
   */
  static _normalizeDPObject(dp) {
    const normalized = {
      dp: dp.dp ?? dp.dpId ?? dp.datapoint ?? dp.id,
      type: dp.type ?? dp.dpType ?? dp.dataType ?? dp.datatype,
      value: dp.value ?? dp.dpValue ?? dp.data,
      raw: dp
    };

    // Parse the value if it's a buffer
    if (Buffer.isBuffer(normalized.value)) {
      const parsed = this.parse(normalized.value, `dp_${normalized.dp}`);
      normalized.value = parsed.value;
      normalized.valueType = parsed.type;
    }

    return normalized;
  }

  /**
   * Parse Tuya DP buffer format
   * Format: [DP ID][Type][Len Hi][Len Lo][Data...]
   */
  static _parseTuyaDPBuffer(buffer) {
    const datapoints = [];
    let offset = 0;

    while (offset < buffer.length - 3) {
      const dp = buffer.readUInt8(offset);
      const type = buffer.readUInt8(offset + 1);
      const length = buffer.readUInt16BE(offset + 2);

      if (offset + 4 + length > buffer.length) break;

      const valueBuffer = buffer.slice(offset + 4, offset + 4 + length);
      let value;

      switch (type) {
      case 0x00: // Raw
        value = valueBuffer;
        break;
      case 0x01: // Bool
        value = valueBuffer.readUInt8(0) === 1;
        break;
      case 0x02: // Value (number)
        if (length === 4) value = valueBuffer.readUInt32BE(0);
        else if (length === 2) value = valueBuffer.readUInt16BE(0);
        else if (length === 1) value = valueBuffer.readUInt8(0);
        else value = valueBuffer;
        break;
      case 0x03: // String
        value = valueBuffer.toString('utf8');
        break;
      case 0x04: // Enum
        value = valueBuffer.readUInt8(0);
        break;
      case 0x05: // Bitmap
        if (length === 1) value = valueBuffer.readUInt8(0);
        else if (length === 2) value = valueBuffer.readUInt16BE(0);
        else if (length === 4) value = valueBuffer.readUInt32BE(0);
        else value = valueBuffer;
        break;
      default:
        value = valueBuffer;
      }

      datapoints.push({ dp, type, value, length });
      offset += 4 + length;
    }

    return datapoints.length > 0 ? datapoints : null;
  }

  /**
   * Check if string is printable
   */
  static _isPrintableString(str) {
    // Must have at least some printable chars and no control chars (except common ones)
    return str.length > 0 &&
      /^[\x20-\x7E\t\n\r]*$/.test(str) &&
      str.replace(/[\s]/g, '').length > 0;
  }

  // ============ SENSOR VALUE CONVERTERS ============

  /**
   * Convert raw value to temperature (°C)
   */
  static toTemperature(value, options = {}) {
    const { divisor = 100, offset = 0, signed = true } = options;

    let numValue = this._toNumber(value);
    if (numValue === null) return null;

    // Handle signed values
    if (signed && numValue > 32767) {
      numValue = numValue - 65536;
    }

    const temp = (numValue / divisor) + offset;

    // Sanity check
    if (temp < -50 || temp > 100) {
      // Try different divisor
      if (Math.abs(numValue / 10) < 100) {
        return Math.round((numValue / 10 + offset) * 10) / 10;
      }
    }

    return Math.round(temp * 10) / 10;
  }

  /**
   * Convert raw value to humidity (%)
   */
  static toHumidity(value, options = {}) {
    const { divisor = 100, min = 0, max = 100 } = options;

    let numValue = this._toNumber(value);
    if (numValue === null) return null;

    let humidity = numValue / divisor;

    // Try divisor of 10 if result is out of range
    if (humidity > 100 && numValue / 10 <= 100) {
      humidity = numValue / 10;
    }
    // Try divisor of 1 if still out of range
    if (humidity > 100 && numValue <= 100) {
      humidity = numValue;
    }

    // Clamp to valid range
    humidity = Math.max(min, Math.min(max, humidity));

    return Math.round(humidity);
  }

  /**
   * Convert raw value to battery percentage (%)
   */
  static toBattery(value, options = {}) {
    const { divisor = 2, max = 100 } = options;

    let numValue = this._toNumber(value);
    if (numValue === null) return null;

    let battery;

    // ZCL format (0-200 = 0-100%)
    if (numValue > 100 && numValue <= 200) {
      battery = numValue / 2;
    }
    // Already percentage
    else if (numValue >= 0 && numValue <= 100) {
      battery = numValue;
    }
    // Voltage (e.g., 2700-3200 mV)
    else if (numValue > 2000 && numValue < 4000) {
      battery = Math.round(((numValue - 2700) / 500) * 100);
    }
    // Unknown format
    else {
      battery = numValue / divisor;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(max, Math.round(battery)));
  }

  /**
   * Convert raw value to illuminance (lux)
   */
  static toIlluminance(value, options = {}) {
    let numValue = this._toNumber(value);
    if (numValue === null) return null;

    // ZCL format: 10000 * log10(lux) + 1
    if (numValue > 10000) {
      return Math.round(Math.pow(10, (numValue - 1) / 10000));
    }

    return Math.max(0, Math.round(numValue));
  }

  /**
   * Convert any value to number
   */
  static _toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    if (Buffer.isBuffer(value)) {
      if (value.length === 1) return value.readUInt8(0);
      if (value.length === 2) return value.readUInt16BE(0);
      if (value.length === 4) return value.readUInt32BE(0);
    }
    if (Array.isArray(value) && value.length > 0) {
      return this._toNumber(value[0]);
    }
    return null;
  }
}

module.exports = AdaptiveDataParser;
