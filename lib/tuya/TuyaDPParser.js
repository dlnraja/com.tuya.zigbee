'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');

/**
 * TUYA DATA POINT (DP) PARSER
 * 
 * Parses the raw buffer from Tuya cluster CLUSTERS.TUYA_EF00 into structured DP data
 * Handles encoding/decoding of Tuya proprietary Data Points
 */

const TUYA_DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05
};

class TuyaDPParser {
  /**
   * Parse Tuya DP from raw ZCL data
   * @param {Buffer} buffer - Raw ZCL data buffer
   * @returns {Object} { dpId, dpType, dpValue }
   */
  static parse(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
      throw new Error('Invalid Tuya DP buffer');
    }

    let offset = 0;
    offset += 1; // Skip status
    offset += 1; // Skip sequence

    const dpId = buffer.readUInt8(offset);
    offset += 1;

    const dpType = buffer.readUInt8(offset);
    offset += 1;

    const dataLength = buffer.readUInt16BE(offset);
    offset += 2;

    const dataBuffer = buffer.slice(offset, offset + dataLength);
    const dpValue = this.parseValue(dpType, dataBuffer);

    return { dpId, dpType, dpValue };
  }

  /**
   * Parse DP value based on type
   * @param {number} dpType - DP type code
   * @param {Buffer} dataBuffer - Data buffer
   * @returns {any} - Parsed value
   */
  static parseValue(dpType, dataBuffer) {
    switch (dpType) {
    case TUYA_DP_TYPE.BOOL:
      return dataBuffer.readUInt8(0) === 1;

    case TUYA_DP_TYPE.VALUE:
      if (dataBuffer.length === 4) return dataBuffer.readInt32BE(0);
      if (dataBuffer.length === 2) return dataBuffer.readInt16BE(0);
      if (dataBuffer.length === 1) return dataBuffer.readUInt8(0);
      return dataBuffer.length >= 4 ? dataBuffer.readInt32BE(0) : dataBuffer.length > 0 ? dataBuffer.readUInt8(0) : 0;

    case TUYA_DP_TYPE.ENUM:
      return dataBuffer.readUInt8(0);

    case TUYA_DP_TYPE.BITMAP:
      const byte = dataBuffer.readUInt8(0);
      const activeBits = [];
      for (let i = 0; i < 8; i++) {
        if (byte & (1 << i)) activeBits.push(i);
      }
      return activeBits;

    case TUYA_DP_TYPE.STRING:
      return dataBuffer.toString('utf8');

    case TUYA_DP_TYPE.RAW:
    default:
      return dataBuffer;
    }
  }

  /**
   * Encode DP value for sending to device
   * @param {number} dpId - DP ID
   * @param {number} dpType - DP type code  
   * @param {any} value - Value to encode
   * @param {number} transId - Transaction ID (default: 0)
   * @returns {Buffer} - Encoded buffer
   */
  static encode(dpId, dpType, value, transId = 0) {
    let dataBuffer;
    switch (dpType) {
    case TUYA_DP_TYPE.BOOL:
      dataBuffer = Buffer.alloc(1);
      dataBuffer.writeUInt8(value ? 1 : 0, 0);
      break;

    case TUYA_DP_TYPE.VALUE:
      dataBuffer = Buffer.alloc(4);
      dataBuffer.writeInt32BE(value, 0);
      break;

    case TUYA_DP_TYPE.ENUM:
      dataBuffer = Buffer.alloc(1);
      dataBuffer.writeUInt8(value, 0);
      break;

    case TUYA_DP_TYPE.STRING:
      dataBuffer = Buffer.from(value, 'utf8');
      break;

    case TUYA_DP_TYPE.RAW:
      dataBuffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
      break;

    default:
      throw new Error(`Unsupported DP type for encoding: ${dpType}`);
    }

    const buffer = Buffer.alloc(6 + dataBuffer.length);
    buffer.writeUInt8(0x00, 0); // Status
    buffer.writeUInt8(transId, 1); // Sequence
    buffer.writeUInt8(dpId, 2); // DP ID
    buffer.writeUInt8(dpType, 3); // DP Type
    buffer.writeUInt16BE(dataBuffer.length, 4); // Length
    dataBuffer.copy(buffer, 6); // Data

    return buffer;
  }
}

TuyaDPParser.DP_TYPE = TUYA_DP_TYPE;

module.exports = { TuyaDPParser, TUYA_DP_TYPE };
