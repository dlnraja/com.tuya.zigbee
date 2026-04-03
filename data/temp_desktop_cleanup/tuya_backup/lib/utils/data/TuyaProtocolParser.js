'use strict';

const DataConverter = require('./DataConverter');

/**
 * TuyaProtocolParser - v5.5.397
 * Complete Tuya DP frame parsing and building
 * Supports: EF00 cluster datapoints, multi-DP frames, all DP types
 */

// Tuya DP Types
const TUYA_DP_TYPE = {
  RAW: 0,      // Raw bytes
  BOOL: 1,    // Boolean (1 byte: 0x00/0x01)
  VALUE: 2,   // Integer (4 bytes, big-endian, signed)
  STRING: 3,  // UTF-8 string
  ENUM: 4,    // Enum (1 byte)
  BITMAP: 5   // Bitmap/flags (1-4 bytes)
};

const TUYA_DP_TYPE_NAME = {
  0: 'RAW', 1: 'BOOL', 2: 'VALUE', 3: 'STRING', 4: 'ENUM', 5: 'BITMAP'
};

// Tuya Commands
const TUYA_COMMAND = {
  DP_QUERY: 0x00,
  DP_REPORT: 0x01,
  DP_SEND: 0x02,
  DP_STATUS: 0x03,
  DP_ACTIVE_REPORT: 0x06,
  TIME_SYNC: 0x24,
  MCU_VERSION: 0x10,
  MCU_OTA: 0x11,
  GATEWAY_STATUS: 0x25
};

class TuyaProtocolParser {
  /**
   * Parse a Tuya EF00 frame into structured data
   * @param {any} data - Raw frame data
   * @returns {Object} - Parsed frame with DPs
   */
  static parseFrame(data) {
    const buf = DataConverter.toBuffer(data);

    if (buf.length < 5) {
      return { valid: false, error: 'Frame too short', raw: buf };
    }

    const frame = {
      valid: true,
      seqNum: buf.readUInt16BE(0),
      command: buf[2],
      commandName: this._getCommandName(buf[2]),
      dataLength: buf.readUInt16BE(3),
      dps: [],
      raw: buf,
      hex: DataConverter.toHex(buf)
    };

    // Parse datapoints
    let offset = 5;
    while (offset + 4 <= buf.length) {
      const dp = this._parseDP(buf, offset);
      if (dp) {
        frame.dps.push(dp);
        offset += 4 + dp.length;
      } else {
        break;
      }
    }

    return frame;
  }

  /**
   * Parse a single DP from buffer at offset
   * @private
   */
  static _parseDP(buf, offset) {
    if (offset + 4 > buf.length) return null;

    const id = buf[offset];
    const type = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);

    if (offset + 4 + length > buf.length) return null;

    const data = buf.slice(offset + 4, offset + 4 + length);

    return {
      id,
      type,
      typeName: TUYA_DP_TYPE_NAME[type] || 'UNKNOWN',
      length,
      data,
      hex: DataConverter.toHex(data),
      value: this._parseValue(type, data)
    };
  }

  /**
   * Parse DP value based on type
   * @private
   */
  static _parseValue(type, data) {
    if (!data || data.length === 0) return null;

    switch (type) {
      case TUYA_DP_TYPE.BOOL:
        return data[0] === 1;

      case TUYA_DP_TYPE.VALUE:
        if (data.length === 4) return data.readInt32BE(0);
        if (data.length === 2) return data.readInt16BE(0);
        if (data.length === 1) return data.readInt8(0);
        return data.readInt32BE(0);

      case TUYA_DP_TYPE.STRING:
        return data.toString('utf8');

      case TUYA_DP_TYPE.ENUM:
        return data[0];

      case TUYA_DP_TYPE.BITMAP:
        if (data.length === 1) return data[0];
        if (data.length === 2) return data.readUInt16BE(0);
        if (data.length === 4) return data.readUInt32BE(0);
        return DataConverter.toHex(data);

      case TUYA_DP_TYPE.RAW:
      default:
        return {
          raw: DataConverter.toArray(data),
          hex: DataConverter.toHex(data)
        };
    }
  }

  /**
   * Build a single DP buffer
   * @param {number} id - DP ID (1-255)
   * @param {number} type - DP type (0-5)
   * @param {any} value - Value to encode
   * @returns {Buffer} - Encoded DP
   */
  static buildDP(id, type, value) {
    let valueBuffer;

    switch (type) {
      case TUYA_DP_TYPE.BOOL:
        valueBuffer = Buffer.from([value ? 1 : 0]);
        break;

      case TUYA_DP_TYPE.VALUE:
        valueBuffer = Buffer.alloc(4);
        valueBuffer.writeInt32BE(Math.round(Number(value) || 0), 0);
        break;

      case TUYA_DP_TYPE.STRING:
        valueBuffer = Buffer.from(String(value), 'utf8');
        break;

      case TUYA_DP_TYPE.ENUM:
        valueBuffer = Buffer.from([Number(value) & 0xFF]);
        break;

      case TUYA_DP_TYPE.BITMAP:
        if (typeof value === 'number') {
          if (value <= 0xFF) {
            valueBuffer = Buffer.from([value]);
          } else if (value <= 0xFFFF) {
            valueBuffer = Buffer.alloc(2);
            valueBuffer.writeUInt16BE(value, 0);
          } else {
            valueBuffer = Buffer.alloc(4);
            valueBuffer.writeUInt32BE(value, 0);
          }
        } else {
          valueBuffer = DataConverter.toBuffer(value);
        }
        break;

      case TUYA_DP_TYPE.RAW:
      default:
        valueBuffer = DataConverter.toBuffer(value);
    }

    // Build DP: [id, type, len_hi, len_lo, ...value]
    const dp = Buffer.alloc(4 + valueBuffer.length);
    dp[0] = id & 0xFF;
    dp[1] = type & 0xFF;
    dp.writeUInt16BE(valueBuffer.length, 2);
    valueBuffer.copy(dp, 4);

    return dp;
  }

  /**
   * Build complete Tuya frame with header
   * @param {number} seqNum - Sequence number
   * @param {number} command - Command byte
   * @param {Buffer|Buffer[]} dps - DP buffer(s)
   * @returns {Buffer} - Complete frame
   */
  static buildFrame(seqNum, command, dps) {
    const dpBuffer = Array.isArray(dps) ? Buffer.concat(dps) : DataConverter.toBuffer(dps);

    const frame = Buffer.alloc(5 + dpBuffer.length);
    frame.writeUInt16BE(seqNum & 0xFFFF, 0);
    frame[2] = command & 0xFF;
    frame.writeUInt16BE(dpBuffer.length, 3);
    dpBuffer.copy(frame, 5);

    return frame;
  }

  /**
   * Build a DP send/set frame
   * @param {number} seqNum - Sequence number
   * @param {number} dpId - DP ID
   * @param {number} dpType - DP type
   * @param {any} value - Value
   * @returns {Buffer} - Complete frame
   */
  static buildSetFrame(seqNum, dpId, dpType, value) {
    const dp = this.buildDP(dpId, dpType, value);
    return this.buildFrame(seqNum, TUYA_COMMAND.DP_SEND, dp);
  }

  /**
   * Build multi-DP frame
   * @param {number} seqNum - Sequence number
   * @param {Array<{id, type, value}>} datapoints - Array of DP definitions
   * @returns {Buffer} - Complete frame
   */
  static buildMultiDPFrame(seqNum, datapoints) {
    const dps = datapoints.map(dp => this.buildDP(dp.id, dp.type, dp.value));
    return this.buildFrame(seqNum, TUYA_COMMAND.DP_SEND, dps);
  }

  /**
   * Detect if buffer looks like a Tuya frame
   * @param {any} data - Data to check
   * @returns {boolean} - True if likely Tuya frame
   */
  static isTuyaFrame(data) {
    const buf = DataConverter.toBuffer(data);
    if (buf.length < 5) return false;

    const dataLen = buf.readUInt16BE(3);
    // Check if declared length matches actual length
    return dataLen === buf.length - 5 || dataLen <= buf.length - 5;
  }

  /**
   * Get command name from byte
   * @private
   */
  static _getCommandName(cmd) {
    const names = {
      0x00: 'DP_QUERY',
      0x01: 'DP_REPORT',
      0x02: 'DP_SEND',
      0x03: 'DP_STATUS',
      0x06: 'DP_ACTIVE_REPORT',
      0x24: 'TIME_SYNC',
      0x10: 'MCU_VERSION',
      0x11: 'MCU_OTA',
      0x25: 'GATEWAY_STATUS'
    };
    return names[cmd] || `UNKNOWN_0x${cmd.toString(16).toUpperCase()}`;
  }

  /**
   * Extract all DPs from raw cluster data (may contain multiple reports)
   * @param {any} data - Raw data
   * @returns {Array<Object>} - Array of parsed DPs
   */
  static extractAllDPs(data) {
    const buf = DataConverter.toBuffer(data);
    const allDPs = [];
    let offset = 0;

    while (offset < buf.length) {
      // Try to parse a frame starting at offset
      if (offset + 5 <= buf.length) {
        const dataLen = buf.readUInt16BE(offset + 3);
        if (offset + 5 + dataLen <= buf.length) {
          const frame = this.parseFrame(buf.slice(offset, offset + 5 + dataLen));
          if (frame.valid) {
            allDPs.push(...frame.dps);
            offset += 5 + dataLen;
            continue;
          }
        }
      }
      offset++;
    }

    return allDPs;
  }
}

module.exports = TuyaProtocolParser;
module.exports.TUYA_DP_TYPE = TUYA_DP_TYPE;
module.exports.TUYA_DP_TYPE_NAME = TUYA_DP_TYPE_NAME;
module.exports.TUYA_COMMAND = TUYA_COMMAND;
