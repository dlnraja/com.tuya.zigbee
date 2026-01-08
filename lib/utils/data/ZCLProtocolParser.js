'use strict';

const DataConverter = require('./DataConverter');

/**
 * ZCLProtocolParser - v5.5.397
 * Zigbee Cluster Library frame parsing and building
 * Supports: General ZCL frames, attribute reports, commands
 */

// ZCL Data Types
const ZCL_TYPE = {
  NO_DATA: 0x00,
  DATA8: 0x08,
  DATA16: 0x09,
  DATA24: 0x0A,
  DATA32: 0x0B,
  BOOLEAN: 0x10,
  BITMAP8: 0x18,
  BITMAP16: 0x19,
  BITMAP32: 0x1B,
  UINT8: 0x20,
  UINT16: 0x21,
  UINT24: 0x22,
  UINT32: 0x23,
  UINT48: 0x25,
  INT8: 0x28,
  INT16: 0x29,
  INT32: 0x2B,
  ENUM8: 0x30,
  ENUM16: 0x31,
  FLOAT: 0x39,
  DOUBLE: 0x3A,
  OCTET_STRING: 0x41,
  CHAR_STRING: 0x42,
  ARRAY: 0x48,
  STRUCT: 0x4C,
  UTC_TIME: 0xE2,
  CLUSTER_ID: 0xE8,
  ATTRIB_ID: 0xE9,
  IEEE_ADDRESS: 0xF0
};

// ZCL Frame Control bits
const ZCL_FRAME_CONTROL = {
  FRAME_TYPE_MASK: 0x03,
  FRAME_TYPE_GLOBAL: 0x00,
  FRAME_TYPE_CLUSTER: 0x01,
  MFG_SPECIFIC: 0x04,
  DIRECTION_SERVER: 0x08,
  DISABLE_DEFAULT_RSP: 0x10
};

// Common ZCL Commands
const ZCL_COMMAND = {
  READ_ATTRIBUTES: 0x00,
  READ_ATTRIBUTES_RSP: 0x01,
  WRITE_ATTRIBUTES: 0x02,
  WRITE_ATTRIBUTES_RSP: 0x04,
  REPORT_ATTRIBUTES: 0x0A,
  DEFAULT_RSP: 0x0B,
  DISCOVER_ATTRIBUTES: 0x0C,
  CONFIGURE_REPORTING: 0x06
};

class ZCLProtocolParser {
  /**
   * Parse a ZCL frame
   * @param {any} data - Raw ZCL data
   * @returns {Object} - Parsed frame
   */
  static parseFrame(data) {
    const buf = DataConverter.toBuffer(data);

    if (buf.length < 3) {
      return { valid: false, error: 'Frame too short', raw: buf };
    }

    const frameControl = buf[0];
    let offset = 1;
    let manufacturerId = null;

    // Check for manufacturer-specific frame
    if (frameControl & ZCL_FRAME_CONTROL.MFG_SPECIFIC) {
      if (buf.length < 5) {
        return { valid: false, error: 'Manufacturer frame too short', raw: buf };
      }
      manufacturerId = buf.readUInt16LE(offset);
      offset += 2;
    }

    const seqNum = buf[offset++];
    const command = buf[offset++];
    const payload = buf.slice(offset);

    const frame = {
      valid: true,
      frameControl,
      frameType: frameControl & ZCL_FRAME_CONTROL.FRAME_TYPE_MASK,
      isClusterSpecific: (frameControl & ZCL_FRAME_CONTROL.FRAME_TYPE_MASK) === ZCL_FRAME_CONTROL.FRAME_TYPE_CLUSTER,
      isGlobal: (frameControl & ZCL_FRAME_CONTROL.FRAME_TYPE_MASK) === ZCL_FRAME_CONTROL.FRAME_TYPE_GLOBAL,
      manufacturerSpecific: !!(frameControl & ZCL_FRAME_CONTROL.MFG_SPECIFIC),
      manufacturerId,
      direction: (frameControl & ZCL_FRAME_CONTROL.DIRECTION_SERVER) ? 'server' : 'client',
      disableDefaultRsp: !!(frameControl & ZCL_FRAME_CONTROL.DISABLE_DEFAULT_RSP),
      seqNum,
      command,
      commandName: this._getCommandName(command, frameControl),
      payload,
      payloadHex: DataConverter.toHex(payload),
      raw: buf
    };

    // Parse attributes if this is a report or read response
    if (frame.isGlobal && (command === ZCL_COMMAND.REPORT_ATTRIBUTES || command === ZCL_COMMAND.READ_ATTRIBUTES_RSP)) {
      frame.attributes = this._parseAttributes(payload);
    }

    return frame;
  }

  /**
   * Parse attribute records from payload
   * @private
   */
  static _parseAttributes(payload) {
    const buf = DataConverter.toBuffer(payload);
    const attributes = [];
    let offset = 0;

    while (offset + 3 <= buf.length) {
      const attrId = buf.readUInt16LE(offset);
      offset += 2;

      // For read response, there's a status byte
      // For report, there's no status byte
      // We'll try to detect based on context

      const dataType = buf[offset++];
      const { value, bytesRead } = this._readTypedValue(buf, offset, dataType);

      attributes.push({
        id: attrId,
        idHex: `0x${attrId.toString(16).padStart(4, '0')}`,
        dataType,
        dataTypeName: this._getTypeName(dataType),
        value,
        raw: buf.slice(offset, offset + bytesRead)
      });

      offset += bytesRead;
    }

    return attributes;
  }

  /**
   * Read a typed value from buffer
   * @private
   */
  static _readTypedValue(buf, offset, dataType) {
    let value;
    let bytesRead = 0;

    switch (dataType) {
      case ZCL_TYPE.BOOLEAN:
        value = buf[offset] === 1;
        bytesRead = 1;
        break;

      case ZCL_TYPE.UINT8:
      case ZCL_TYPE.ENUM8:
      case ZCL_TYPE.BITMAP8:
      case ZCL_TYPE.DATA8:
        value = buf.readUInt8(offset);
        bytesRead = 1;
        break;

      case ZCL_TYPE.INT8:
        value = buf.readInt8(offset);
        bytesRead = 1;
        break;

      case ZCL_TYPE.UINT16:
      case ZCL_TYPE.ENUM16:
      case ZCL_TYPE.BITMAP16:
      case ZCL_TYPE.DATA16:
        value = buf.readUInt16LE(offset);
        bytesRead = 2;
        break;

      case ZCL_TYPE.INT16:
        value = buf.readInt16LE(offset);
        bytesRead = 2;
        break;

      case ZCL_TYPE.UINT24:
      case ZCL_TYPE.DATA24:
        value = buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
        bytesRead = 3;
        break;

      case ZCL_TYPE.UINT32:
      case ZCL_TYPE.BITMAP32:
      case ZCL_TYPE.DATA32:
      case ZCL_TYPE.UTC_TIME:
        value = buf.readUInt32LE(offset);
        bytesRead = 4;
        break;

      case ZCL_TYPE.INT32:
        value = buf.readInt32LE(offset);
        bytesRead = 4;
        break;

      case ZCL_TYPE.FLOAT:
        value = buf.readFloatLE(offset);
        bytesRead = 4;
        break;

      case ZCL_TYPE.DOUBLE:
        value = buf.readDoubleLE(offset);
        bytesRead = 8;
        break;

      case ZCL_TYPE.OCTET_STRING:
      case ZCL_TYPE.CHAR_STRING:
        const strLen = buf[offset];
        bytesRead = 1 + strLen;
        if (dataType === ZCL_TYPE.CHAR_STRING) {
          value = buf.slice(offset + 1, offset + 1 + strLen).toString('utf8');
        } else {
          value = DataConverter.toHex(buf.slice(offset + 1, offset + 1 + strLen));
        }
        break;

      case ZCL_TYPE.IEEE_ADDRESS:
        value = DataConverter.toHex(buf.slice(offset, offset + 8));
        bytesRead = 8;
        break;

      default:
        // Unknown type - return raw
        value = buf[offset];
        bytesRead = 1;
    }

    return { value, bytesRead };
  }

  /**
   * Build a ZCL frame header
   * @param {Object} options - Frame options
   * @returns {Buffer} - Frame header
   */
  static buildFrameHeader(options = {}) {
    const {
      clusterSpecific = false,
      manufacturerSpecific = false,
      manufacturerId = null,
      direction = 'client',
      disableDefaultRsp = false,
      seqNum = 0,
      command = 0
    } = options;

    let frameControl = 0;
    if (clusterSpecific) frameControl |= ZCL_FRAME_CONTROL.FRAME_TYPE_CLUSTER;
    if (manufacturerSpecific) frameControl |= ZCL_FRAME_CONTROL.MFG_SPECIFIC;
    if (direction === 'server') frameControl |= ZCL_FRAME_CONTROL.DIRECTION_SERVER;
    if (disableDefaultRsp) frameControl |= ZCL_FRAME_CONTROL.DISABLE_DEFAULT_RSP;

    const parts = [Buffer.from([frameControl])];

    if (manufacturerSpecific && manufacturerId !== null) {
      const mfgBuf = Buffer.alloc(2);
      mfgBuf.writeUInt16LE(manufacturerId, 0);
      parts.push(mfgBuf);
    }

    parts.push(Buffer.from([seqNum, command]));

    return Buffer.concat(parts);
  }

  /**
   * Build attribute write payload
   * @param {number} attrId - Attribute ID
   * @param {number} dataType - ZCL data type
   * @param {any} value - Value to write
   * @returns {Buffer} - Attribute payload
   */
  static buildAttributePayload(attrId, dataType, value) {
    const attrBuf = Buffer.alloc(2);
    attrBuf.writeUInt16LE(attrId, 0);

    const valueBuf = this._writeTypedValue(dataType, value);

    return Buffer.concat([attrBuf, Buffer.from([dataType]), valueBuf]);
  }

  /**
   * Write a typed value to buffer
   * @private
   */
  static _writeTypedValue(dataType, value) {
    switch (dataType) {
      case ZCL_TYPE.BOOLEAN:
        return Buffer.from([value ? 1 : 0]);

      case ZCL_TYPE.UINT8:
      case ZCL_TYPE.ENUM8:
      case ZCL_TYPE.BITMAP8:
        return Buffer.from([value & 0xFF]);

      case ZCL_TYPE.INT8:
        const i8 = Buffer.alloc(1);
        i8.writeInt8(value, 0);
        return i8;

      case ZCL_TYPE.UINT16:
      case ZCL_TYPE.ENUM16:
      case ZCL_TYPE.BITMAP16:
        const u16 = Buffer.alloc(2);
        u16.writeUInt16LE(value, 0);
        return u16;

      case ZCL_TYPE.INT16:
        const i16 = Buffer.alloc(2);
        i16.writeInt16LE(value, 0);
        return i16;

      case ZCL_TYPE.UINT32:
      case ZCL_TYPE.BITMAP32:
        const u32 = Buffer.alloc(4);
        u32.writeUInt32LE(value, 0);
        return u32;

      case ZCL_TYPE.INT32:
        const i32 = Buffer.alloc(4);
        i32.writeInt32LE(value, 0);
        return i32;

      case ZCL_TYPE.CHAR_STRING:
        const str = String(value);
        return Buffer.concat([Buffer.from([str.length]), Buffer.from(str, 'utf8')]);

      default:
        return DataConverter.toBuffer(value);
    }
  }

  /**
   * Get type name from ZCL type
   * @private
   */
  static _getTypeName(type) {
    const names = {
      [ZCL_TYPE.BOOLEAN]: 'BOOLEAN',
      [ZCL_TYPE.UINT8]: 'UINT8',
      [ZCL_TYPE.UINT16]: 'UINT16',
      [ZCL_TYPE.UINT32]: 'UINT32',
      [ZCL_TYPE.INT8]: 'INT8',
      [ZCL_TYPE.INT16]: 'INT16',
      [ZCL_TYPE.INT32]: 'INT32',
      [ZCL_TYPE.ENUM8]: 'ENUM8',
      [ZCL_TYPE.ENUM16]: 'ENUM16',
      [ZCL_TYPE.BITMAP8]: 'BITMAP8',
      [ZCL_TYPE.BITMAP16]: 'BITMAP16',
      [ZCL_TYPE.BITMAP32]: 'BITMAP32',
      [ZCL_TYPE.FLOAT]: 'FLOAT',
      [ZCL_TYPE.CHAR_STRING]: 'CHAR_STRING',
      [ZCL_TYPE.OCTET_STRING]: 'OCTET_STRING'
    };
    return names[type] || `TYPE_0x${type.toString(16).toUpperCase()}`;
  }

  /**
   * Get command name
   * @private
   */
  static _getCommandName(cmd, frameControl) {
    if ((frameControl & ZCL_FRAME_CONTROL.FRAME_TYPE_MASK) === ZCL_FRAME_CONTROL.FRAME_TYPE_GLOBAL) {
      const names = {
        0x00: 'READ_ATTRIBUTES',
        0x01: 'READ_ATTRIBUTES_RSP',
        0x02: 'WRITE_ATTRIBUTES',
        0x04: 'WRITE_ATTRIBUTES_RSP',
        0x06: 'CONFIGURE_REPORTING',
        0x0A: 'REPORT_ATTRIBUTES',
        0x0B: 'DEFAULT_RSP',
        0x0C: 'DISCOVER_ATTRIBUTES'
      };
      return names[cmd] || `GLOBAL_0x${cmd.toString(16).toUpperCase()}`;
    }
    return `CLUSTER_CMD_0x${cmd.toString(16).toUpperCase()}`;
  }

  /**
   * Detect if data is a ZCL frame
   * @param {any} data - Data to check
   * @returns {boolean}
   */
  static isZCLFrame(data) {
    const buf = DataConverter.toBuffer(data);
    if (buf.length < 3) return false;

    const frameType = buf[0] & ZCL_FRAME_CONTROL.FRAME_TYPE_MASK;
    return frameType <= 1; // 0 = global, 1 = cluster-specific
  }
}

module.exports = ZCLProtocolParser;
module.exports.ZCL_TYPE = ZCL_TYPE;
module.exports.ZCL_FRAME_CONTROL = ZCL_FRAME_CONTROL;
module.exports.ZCL_COMMAND = ZCL_COMMAND;
