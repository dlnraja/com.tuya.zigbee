'use strict';
const { safeDivide, safeMultiply } = require('../tuyaUtils.js');

const DataConverter = require('./DataConverter');

/**
 * TypedDataReader - v5.5.397
 * Read and write typed values from/to buffers
 * Supports: All common integer types, floats, booleans, strings
 */

// Type size lookup
const TYPE_SIZES = {
  'uint8': 1, 'int8': 1, 'bool': 1, 'boolean': 1,
  'uint16le': 2, 'uint16be': 2, 'int16le': 2, 'int16be': 2,
  'uint24le': 3, 'uint24be': 3,
  'uint32le': 4, 'uint32be': 4, 'int32le': 4, 'int32be': 4,
  'floatle': 4, 'floatbe': 4,
  'uint48le': 6, 'uint48be': 6,
  'uint64le': 8, 'uint64be': 8, 'doublele': 8, 'doublebe': 8
};

class TypedDataReader {
  /**
   * Read a typed value from buffer
   * @param {any} data - Source data
   * @param {string|number} type - Type name or ZCL type code
   * @param {number} offset - Read offset (default: 0)
   * @returns {any} - Read value
   */
  static read(data, type, offset = 0) {
    const buf = DataConverter.toBuffer(data);

    if (offset >= buf.length) return null;

    // Handle string type names
    if (typeof type === 'string') {
      const typeLower = type.toLowerCase();

      const readers = {
        // 8-bit
        'uint8': () => buf.readUInt8(offset),
        'int8': () => buf.readInt8(offset),
        'bool': () => buf[offset] === 1,
        'boolean': () => buf[offset] === 1,
        'byte': () => buf[offset],

        // 16-bit
        'uint16le': () => buf.readUInt16LE(offset),
        'uint16be': () => buf.readUInt16BE(offset),
        'uint16': () => buf.readUInt16LE(offset), // Default LE
        'int16le': () => buf.readInt16LE(offset),
        'int16be': () => buf.readInt16BE(offset),
        'int16': () => buf.readInt16LE(offset),

        // 24-bit (manual)
        'uint24le': () => buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16),
        'uint24be': () => (buf[offset] << 16) | (buf[offset + 1] << 8) | buf[offset + 2],
        'uint24': () => buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16),

        // 32-bit
        'uint32le': () => buf.readUInt32LE(offset),
        'uint32be': () => buf.readUInt32BE(offset),
        'uint32': () => buf.readUInt32LE(offset),
        'int32le': () => buf.readInt32LE(offset),
        'int32be': () => buf.readInt32BE(offset),
        'int32': () => buf.readInt32LE(offset),

        // Floats
        'floatle': () => buf.readFloatLE(offset),
        'floatbe': () => buf.readFloatBE(offset),
        'float': () => buf.readFloatLE(offset),
        'doublele': () => buf.readDoubleLE(offset),
        'doublebe': () => buf.readDoubleBE(offset),
        'double': () => buf.readDoubleLE(offset),

        // Strings
        'string': () => buf.slice(offset).toString('utf8').replace(/\0/g, ''),
        'cstring': () => {
          let end = offset;
          while (end < buf.length && buf[end] !== 0) end++;
          return buf.slice(offset, end).toString('utf8');
        },

        // Raw
        'hex': () => DataConverter.toHex(buf.slice(offset)),
        'raw': () => buf.slice(offset)
      };

      const reader = readers[typeLower];
      if (reader) {
        try {
          return reader();
        } catch (e) {
          return null;
        }
      }
    }

    // Handle ZCL type codes (numeric)
    if (typeof type === 'number') {
      return this._readZCLType(buf, type, offset);
    }

    // Default: return raw slice
    return buf.slice(offset);
  }

  /**
   * Read ZCL typed value (Comprehensive v2.0)
   * @private
   */
  static _readZCLType(buf, type, offset) {
    // ZCL Data Types (Comprehensive map)
    const ZCL = {
      NO_DATA: 0x00, DATA8: 0x08, DATA16: 0x09, DATA24: 0x0A, DATA32: 0x0B,
      BOOLEAN: 0x10, BITMAP8: 0x18, BITMAP16: 0x19, BITMAP32: 0x1B,
      UINT8: 0x20, UINT16: 0x21, UINT24: 0x22, UINT32: 0x23, UINT48: 0x25,
      INT8: 0x28, INT16: 0x29, INT32: 0x2B, ENUM8: 0x30, ENUM16: 0x31,
      FLOAT: 0x39, DOUBLE: 0x3A, OCTET_STRING: 0x41, CHAR_STRING: 0x42,
      LONG_OCTET_STRING: 0x43, LONG_CHAR_STRING: 0x44, ARRAY: 0x48,
      STRUCT: 0x4C, TIME: 0xE0, DATE: 0xE1, UTC: 0xE2,
      CLUSTER_ID: 0xE8, ATTRIB_ID: 0xE9, IEEE_ADDR: 0xF0
    };

    try {
      switch (type) {
      case ZCL.BOOLEAN: return buf[offset] === 1;
      case ZCL.UINT8:
      case ZCL.ENUM8:
      case ZCL.BITMAP8:
      case ZCL.DATA8:
        return buf.readUInt8(offset);
      case ZCL.INT8:
        return buf.readInt8(offset);
      case ZCL.UINT16:
      case ZCL.ENUM16:
      case ZCL.BITMAP16:
      case ZCL.DATA16:
      case ZCL.CLUSTER_ID:
      case ZCL.ATTRIB_ID:
        return buf.readUInt16LE(offset);
      case ZCL.INT16:
        return buf.readInt16LE(offset);
      case ZCL.UINT24:
      case ZCL.DATA24:
        return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
      case ZCL.UINT32:
      case ZCL.BITMAP32:
      case ZCL.DATA32:
      case ZCL.UTC:
        return buf.readUInt32LE(offset);
      case ZCL.INT32:
        return buf.readInt32LE(offset);
      case ZCL.FLOAT:
        return buf.readFloatLE(offset);
      case ZCL.DOUBLE:
        return buf.readDoubleLE(offset);
      case ZCL.CHAR_STRING:
      case ZCL.OCTET_STRING: {
        const len = buf[offset];
        const val = buf.slice(offset + 1, offset + 1 + len);
        return type === ZCL.CHAR_STRING ? val.toString('utf8') : val.toString('hex');
      }
      case ZCL.LONG_CHAR_STRING:
      case ZCL.LONG_OCTET_STRING: {
        const len = buf.readUInt16LE(offset);
        const val = buf.slice(offset + 2, offset + 2 + len);
        return type === ZCL.LONG_CHAR_STRING ? val.toString('utf8') : val.toString('hex');
      }
      case ZCL.IEEE_ADDR:
        return buf.slice(offset, offset + 8).reverse().toString('hex');
      default:
        return buf.slice(offset, offset + 1).toString('hex'); // Fallback to 1-byte hex
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * Write a typed value to buffer
   * @param {string} type - Type name
   * @param {any} value - Value to write
   * @returns {Buffer} - Written buffer
   */
  static write(type, value) {
    const typeLower = type.toLowerCase();
    const size = TYPE_SIZES[typeLower] || 1;
    const buf = Buffer.alloc(size);

    const writers = {
      // 8-bit
      'uint8': () => buf.writeUInt8(value & 0xFF, 0),
      'int8': () => buf.writeInt8(value, 0),
      'bool': () => buf.writeUInt8(value ? 1 : 0, 0),
      'boolean': () => buf.writeUInt8(value ? 1 : 0, 0),
      'byte': () => buf.writeUInt8(value & 0xFF, 0),

      // 16-bit
      'uint16le': () => buf.writeUInt16LE(value & 0xFFFF, 0),
      'uint16be': () => buf.writeUInt16BE(value & 0xFFFF, 0),
      'uint16': () => buf.writeUInt16LE(value & 0xFFFF, 0),
      'int16le': () => buf.writeInt16LE(value, 0),
      'int16be': () => buf.writeInt16BE(value, 0),
      'int16': () => buf.writeInt16LE(value, 0),

      // 24-bit
      'uint24le': () => {
        buf[0] = value & 0xFF;
        buf[1] = (value >> 8) & 0xFF;
        buf[2] = (value >> 16) & 0xFF;
      },
      'uint24be': () => {
        buf[0] = (value >> 16) & 0xFF;
        buf[1] = (value >> 8) & 0xFF;
        buf[2] = value & 0xFF;
      },

      // 32-bit
      'uint32le': () => buf.writeUInt32LE(value >>> 0, 0),
      'uint32be': () => buf.writeUInt32BE(value >>> 0, 0),
      'uint32': () => buf.writeUInt32LE(value >>> 0, 0),
      'int32le': () => buf.writeInt32LE(value, 0),
      'int32be': () => buf.writeInt32BE(value, 0),
      'int32': () => buf.writeInt32LE(value, 0),

      // Floats
      'floatle': () => buf.writeFloatLE(value, 0),
      'floatbe': () => buf.writeFloatBE(value, 0),
      'float': () => buf.writeFloatLE(value, 0),
      'doublele': () => buf.writeDoubleLE(value, 0),
      'doublebe': () => buf.writeDoubleBE(value, 0),
      'double': () => buf.writeDoubleLE(value, 0)
    };

    const writer = writers[typeLower];
    if (writer) {
      writer();
      return buf;
    }

    // String types
    if (typeLower === 'string') {
      return Buffer.from(String(value), 'utf8');
    }

    return DataConverter.toBuffer(value);
  }

  /**
   * Read multiple values from buffer
   * @param {any} data - Source data
   * @param {Array<{type: string, name?: string}>} schema - Read schema
   * @returns {Object} - Object with named values
   */
  static readSchema(data, schema) {
    const buf = DataConverter.toBuffer(data);
    const result = {};
    let offset = 0;

    for (const field of schema) {
       const size = TYPE_SIZES[field.type?.toLowerCase()] || 1;
       const value = this.read(buf, field.type, offset);
      const name = field.name || `field_${offset}`;
      result[name] = value;
      offset += size;
    }

    return result;
  }

  /**
   * Write multiple values to buffer
   * @param {Array<{type: string, value: any}>} schema - Write schema
   * @returns {Buffer} - Combined buffer
   */
  static writeSchema(schema) {
    const buffers = schema.map(field => this.write(field.type, field.value));
    return Buffer.concat(buffers);
  }

  /**
   * Get size of a type in bytes
   * @param {string} type - Type name
   * @returns {number} - Size in bytes
   */
  static getTypeSize(type) {
    return TYPE_SIZES[type?.toLowerCase()] || 0;
  }

  /**
   * Auto-detect and read value based on buffer size
   * @param {any} data - Source data
   * @param {boolean} signed - Whether to read as signed
   * @param {string} endian - 'le' or 'be'
   * @returns {number} - Read value
   */
  static readAuto(data, signed = false, endian = 'be') {
    const buf = DataConverter.toBuffer(data);
    const le = endian.toLowerCase() === 'le';

    switch (buf.length) {
    case 1:
      return signed ? buf.readInt8(0) : buf.readUInt8(0);
    case 2:
      return signed
        ? (le ? buf.readInt16LE(0) : buf.readInt16BE(0))
        : (le ? buf.readUInt16LE(0) : buf.readUInt16BE(0));
    case 4:
      return signed
        ? (le ? buf.readInt32LE(0) : buf.readInt32BE(0))
        : (le ? buf.readUInt32LE(0) : buf.readUInt32BE(0));
    default:
      // For other sizes, read as big number
      let value = 0;
      for (let i = 0; i < buf.length; i++) {
        const idx = le ? i : buf.length - 1 - i;
        value += safeMultiply(buf[idx], Math.pow(256, i));
      }
      return value;
    }
  }
}

module.exports = TypedDataReader;
module.exports.TYPE_SIZES = TYPE_SIZES;
