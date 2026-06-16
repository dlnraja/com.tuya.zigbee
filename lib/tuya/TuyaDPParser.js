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

    let offset = 0;

    // v7.3: MCU UART HEADER DETECTION (Zigbee over MCU)
    // Some devices encapsulate full Tuya UART frames starting with 0x55 0xAA
    if (buffer.length >= 7 && buffer[0] === 0x55 && buffer[1] === 0xAA) {
      // 0x55 0xAA [Version] [Command] [Length_H] [Length_L] [Data...] [Checksum]
      offset = 6; // Skip to Data payload where DP ID resides
    } else {
      // Standard ZCL payload
      // Byte 0: Status (usually 0x00, sometimes 0x01 or 0x09 for Tuya MCU time sync)
      // Byte 1: Transaction sequence number
      
      if (buffer[0] === 0x09 && buffer.length > 9) {
        // Tuya MCU specific 9-byte header (e.g., time sync requests)
        offset += 8;
      } else {
        // Standard Tuya 0xEF00 2-byte header
        offset += 2;
      }
    }

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
   * Parse multiple DPs from a single buffer (Tuya multi-DP frames)
   * Some devices send multiple DPs in one Zigbee frame
   * @param {Buffer} buffer - Raw ZCL data buffer
   * @returns {Array<Object>} - Array of { dpId, dpType, dpValue }
   */
  static parseMultiple(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
      return [];
    }

    const results = [];
    let offset = 0;

    // MCU UART HEADER DETECTION
    if (buffer.length >= 7 && buffer[0] === 0x55 && buffer[1] === 0xAA) {
      offset = 6;
    } else {
      // Standard ZCL header (status + seqnum = 2 bytes)
      offset = 2;
    }

    // Iterate through buffer parsing DPs until exhausted
    while (offset < buffer.length - 4) {
      try {
        const dpId = buffer.readUInt8(offset);
        offset += 1;

        const dpType = buffer.readUInt8(offset);
        offset += 1;

        const dataLength = buffer.readUInt16BE(offset);
        offset += 2;

        if (offset + dataLength > buffer.length) {
          break; // Not enough data for this DP
        }

        const dataBuffer = buffer.slice(offset, offset + dataLength);
        offset += dataLength;

        const dpValue = this.parseValue(dpType, dataBuffer);
        results.push({ dpId, dpType, dpValue });
      } catch (err) {
        break; // Parsing error, stop
      }
    }

    return results;
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
module.exports.TuyaDPParser = TuyaDPParser;

