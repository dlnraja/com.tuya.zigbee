'use strict';

/**
 * TUYA DATA POINT (DP) PARSER
 * 
 * Parses the raw buffer from Tuya cluster 0xEF00 into structured DP data
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

    // Tuya DP format:
    // Byte 0: Status (usually 0x00)
    // Byte 1: Transaction sequence number
    // Byte 2: DP ID
    // Byte 3: DP Type
    // Byte 4-5: Data length (big-endian uint16)
    // Byte 6+: Data value

    let offset = 0;

    // Skip status byte
    offset += 1;

    // Skip sequence number
    offset += 1;

    // Read DP ID
    const dpId = buffer.readUInt8(offset);
    offset += 1;

    // Read DP Type
    const dpType = buffer.readUInt8(offset);
    offset += 1;

    // Read data length (big-endian)
    const dataLength = buffer.readUInt16BE(offset);
    offset += 2;

    // Extract data buffer
    const dataBuffer = buffer.slice(offset, offset + dataLength);

    // Parse value based on type
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
      // 4-byte big-endian integer (most common)
      if (dataBuffer.length === 4) {
        return dataBuffer.readInt32BE(0);
      }
      // 2-byte big-endian integer (common for temp, battery)
      if (dataBuffer.length === 2) {
        return dataBuffer.readInt16BE(0);
      }
      // 1-byte integer
      if (dataBuffer.length === 1) {
        return dataBuffer.readUInt8(0);
      }
      // Fallback: try to read as 4-byte
      return dataBuffer.readInt32BE(0);

    case TUYA_DP_TYPE.ENUM:
      return dataBuffer.readUInt8(0);

    case TUYA_DP_TYPE.BITMAP:
      // Return as array of active bits
      const byte = dataBuffer.readUInt8(0);
      const activeBits = [];
      for (let i = 0; i < 8; i++) {
        if (byte & (1 << i)) {
          activeBits.push(i);
        }
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
    const buffer = Buffer.alloc(100); // Adjust size as needed
    let offset = 0;

    // Status byte
    buffer.writeUInt8(0x00, offset);
    offset += 1;

    // Transaction sequence number
    buffer.writeUInt8(transId, offset);
    offset += 1;

    // DP ID
    buffer.writeUInt8(dpId, offset);
    offset += 1;

    // DP Type
    buffer.writeUInt8(dpType, offset);
    offset += 1;

    // Encode value based on type
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

    // Write data length
    buffer.writeUInt16BE(dataBuffer.length, offset);
    offset += 2;

    // Write data
    dataBuffer.copy(buffer, offset);
    offset += dataBuffer.length;

    return buffer.slice(0, offset);
  }
}

// Export DP types for reference
TuyaDPParser.DP_TYPE = TUYA_DP_TYPE;

module.exports = TuyaDPParser;
