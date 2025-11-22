'use strict';

/**
 * dp-parser-enhanced.js - Enhanced Tuya DP parser
 * 
 * Handles multiple payload formats:
 * - Raw Buffer
 * - Base64 string
 * - JSON string
 * - Endpoint 242 special handling
 * 
 * Supports multi-gang DP mappings (e.g., DP 1 = gang 1, DP 2 = gang 2)
 * 
 * Based on Tuya developer docs:
 * https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard
 */

/**
 * Parse Tuya DP payload from various formats
 * @param {Buffer|string|object} payload - Raw payload
 * @param {number} endpoint - Zigbee endpoint (242 for Tuya DP)
 * @returns {Array<object>} - Array of {dpId, dpType, value}
 */
function parseTuyaDp(payload, endpoint = null) {
  try {
    // Handle null/undefined
    if (!payload) {
      console.warn('[DP-PARSER] Empty payload');
      return [];
    }

    // Convert payload to Buffer
    let buf = convertToBuffer(payload);
    
    if (!buf || buf.length === 0) {
      console.warn('[DP-PARSER] Failed to convert payload to Buffer');
      return [];
    }

    // Parse DP frames
    const dps = parseBuffer(buf);
    
    // Log parsed DPs
    if (dps.length > 0) {
      console.log(`[DP-PARSER] ✅ Parsed ${dps.length} DP(s) from ${endpoint ? `endpoint ${endpoint}` : 'payload'}`);
      dps.forEach(dp => {
        console.log(`   DP ${dp.dpId} (type ${dp.dpType}): ${JSON.stringify(dp.value)}`);
      });
    }

    return dps;

  } catch (err) {
    console.error('[DP-PARSER] ❌ Parse error:', err.message);
    return [];
  }
}

/**
 * Convert various payload formats to Buffer
 * @param {Buffer|string|object} payload
 * @returns {Buffer|null}
 */
function convertToBuffer(payload) {
  try {
    // Already a Buffer
    if (Buffer.isBuffer(payload)) {
      return payload;
    }

    // String payload
    if (typeof payload === 'string') {
      // Try base64 first
      try {
        const base64Buf = Buffer.from(payload, 'base64');
        // Validate it's not gibberish
        if (base64Buf.length > 0) {
          return base64Buf;
        }
      } catch (e) {
        // Not base64, continue
      }

      // Try JSON
      try {
        const jsonObj = JSON.parse(payload);
        if (Array.isArray(jsonObj)) {
          return Buffer.from(jsonObj);
        }
        // If object with data property
        if (jsonObj.data && Array.isArray(jsonObj.data)) {
          return Buffer.from(jsonObj.data);
        }
      } catch (e) {
        // Not JSON, continue
      }

      // Try hex
      try {
        const hexBuf = Buffer.from(payload, 'hex');
        if (hexBuf.length > 0) {
          return hexBuf;
        }
      } catch (e) {
        // Not hex, continue
      }

      // Try UTF-8 as last resort
      return Buffer.from(payload, 'utf8');
    }

    // Object payload
    if (typeof payload === 'object') {
      // Array of bytes
      if (Array.isArray(payload)) {
        return Buffer.from(payload);
      }

      // Object with data property
      if (payload.data) {
        if (Buffer.isBuffer(payload.data)) {
          return payload.data;
        }
        if (Array.isArray(payload.data)) {
          return Buffer.from(payload.data);
        }
      }

      // Try to stringify and parse
      return Buffer.from(JSON.stringify(payload), 'utf8');
    }

    console.warn('[DP-PARSER] Unknown payload type:', typeof payload);
    return null;

  } catch (err) {
    console.error('[DP-PARSER] Buffer conversion error:', err.message);
    return null;
  }
}

/**
 * Parse Buffer into DP frames
 * @param {Buffer} buf
 * @returns {Array<object>}
 */
function parseBuffer(buf) {
  const dps = [];
  let offset = 0;

  try {
    while (offset < buf.length) {
      // Need at least 4 bytes: dpId (1) + dpType (1) + dpLen (2)
      if (offset + 4 > buf.length) {
        console.warn(`[DP-PARSER] Incomplete frame at offset ${offset}`);
        break;
      }

      const dpId = buf.readUInt8(offset);
      offset += 1;

      const dpType = buf.readUInt8(offset);
      offset += 1;

      const dpLen = buf.readUInt16BE(offset);
      offset += 2;

      // Validate length
      if (offset + dpLen > buf.length) {
        console.warn(`[DP-PARSER] DP ${dpId}: Invalid length ${dpLen} at offset ${offset}`);
        break;
      }

      const dpData = buf.slice(offset, offset + dpLen);
      offset += dpLen;

      // Parse value based on type
      const value = parseValue(dpType, dpData);

      dps.push({
        dpId,
        dpType,
        value,
        raw: dpData
      });
    }

  } catch (err) {
    console.error('[DP-PARSER] Frame parse error:', err.message);
  }

  return dps;
}

/**
 * Parse DP value based on type
 * @param {number} dpType - DP type (0x00-0x05)
 * @param {Buffer} data - DP data
 * @returns {any}
 */
function parseValue(dpType, data) {
  try {
    switch (dpType) {
    case 0x00: // Raw
      return data;

    case 0x01: // Boolean
      return data.readUInt8(0) !== 0;

    case 0x02: // Value (4 bytes)
      if (data.length >= 4) {
        return data.readUInt32BE(0);
      }
      if (data.length === 2) {
        return data.readUInt16BE(0);
      }
      if (data.length === 1) {
        return data.readUInt8(0);
      }
      return data;

    case 0x03: // String
      return data.toString('utf8');

    case 0x04: // Enum (1 byte)
      return data.readUInt8(0);

    case 0x05: // Bitmap (4 bytes)
      if (data.length >= 4) {
        return data.readUInt32BE(0);
      }
      return data;

    default:
      console.warn(`[DP-PARSER] Unknown DP type: 0x${dpType.toString(16)}`);
      return data;
    }
  } catch (err) {
    console.error(`[DP-PARSER] Value parse error (type ${dpType}):`, err.message);
    return data;
  }
}

/**
 * Map DP to capability for multi-gang devices
 * @param {number} dpId - DP ID
 * @param {any} value - DP value
 * @param {object} opts - Options: { gangCount, capabilityPrefix }
 * @returns {object|null} - { capability, value } or null
 */
function mapDpToCapability(dpId, value, opts = {}) {
  const { gangCount = 1, capabilityPrefix = 'onoff' } = opts;

  try {
    // Standard single-gang mapping
    if (gangCount === 1) {
      if (dpId === 1) {
        return { capability: 'onoff', value: Boolean(value) };
      }
    }

    // Multi-gang mapping
    if (gangCount > 1) {
      // DP 1 = gang 1
      if (dpId === 1) {
        return { capability: 'onoff', value: Boolean(value) };
      }
      
      // DP 2-6 = gang 2-6
      if (dpId >= 2 && dpId <= gangCount) {
        const gangNum = dpId;
        return { 
          capability: `${capabilityPrefix}.gang${gangNum}`, 
          value: Boolean(value) 
        };
      }
    }

    // Common mappings regardless of gang count
    switch (dpId) {
    case 15: // Battery
      return { capability: 'measure_battery', value: Number(value) };
      
    case 4: // Battery (alternate)
      return { capability: 'measure_battery', value: Number(value) };
      
    case 14: // Battery low alarm
      return { capability: 'alarm_battery', value: Boolean(value) };
      
    case 7: // Power (W)
      return { capability: 'measure_power', value: Number(value) };
      
    case 6: // Voltage (V * 10)
      return { capability: 'measure_voltage', value: Number(value) / 10 };
      
    case 5: // Current (mA)
      return { capability: 'measure_current', value: Number(value) / 1000 };
      
    case 19: // Humidity (% * 10)
      return { capability: 'measure_humidity', value: Number(value) / 10 };
      
    case 18: // Temperature (°C * 10)
      return { capability: 'measure_temperature', value: Number(value) / 10 };
      
    default:
      return null;
    }

  } catch (err) {
    console.error(`[DP-PARSER] Mapping error DP ${dpId}:`, err.message);
    return null;
  }
}

/**
 * Encode DP value for sending to device
 * @param {number} dpId - DP ID
 * @param {number} dpType - DP type
 * @param {any} value - Value to encode
 * @returns {Buffer}
 */
function encodeDpValue(dpId, dpType, value) {
  try {
    let dataBuf;

    switch (dpType) {
    case 0x01: // Boolean
      dataBuf = Buffer.alloc(1);
      dataBuf.writeUInt8(value ? 1 : 0, 0);
      break;

    case 0x02: // Value (4 bytes)
      dataBuf = Buffer.alloc(4);
      dataBuf.writeUInt32BE(Number(value), 0);
      break;

    case 0x03: // String
      dataBuf = Buffer.from(String(value), 'utf8');
      break;

    case 0x04: // Enum
      dataBuf = Buffer.alloc(1);
      dataBuf.writeUInt8(Number(value), 0);
      break;

    case 0x05: // Bitmap
      dataBuf = Buffer.alloc(4);
      dataBuf.writeUInt32BE(Number(value), 0);
      break;

    default:
      throw new Error(`Unknown DP type: ${dpType}`);
    }

    // Build frame: dpId (1) + dpType (1) + dpLen (2) + data
    const frame = Buffer.alloc(4 + dataBuf.length);
    frame.writeUInt8(dpId, 0);
    frame.writeUInt8(dpType, 1);
    frame.writeUInt16BE(dataBuf.length, 2);
    dataBuf.copy(frame, 4);

    return frame;

  } catch (err) {
    console.error(`[DP-PARSER] Encode error DP ${dpId}:`, err.message);
    throw err;
  }
}

module.exports = {
  parseTuyaDp,
  convertToBuffer,
  parseBuffer,
  parseValue,
  mapDpToCapability,
  encodeDpValue
};
