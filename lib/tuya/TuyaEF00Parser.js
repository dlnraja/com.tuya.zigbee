'use strict';

/**
 * TuyaEF00Parser - v5.3.15
 *
 * Lightweight parser for Tuya EF00 frames
 * Use this for quick DP parsing without full cluster wrapper
 */

const { Buffer } = require('buffer');

// DP Types
const DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05,
};

class TuyaEF00Parser {
  constructor(device) {
    this.device = device;
    this.seq = 0;
    this.device.log('[TuyaEF00Parser] ✅ Ready');
  }

  /**
   * Parse incoming Tuya frame
   * Frame format: [seq:2][dp:1][type:1][len:2][data:len]
   */
  parseFrame(commandId, payload) {
    try {
      if (!payload || payload.length < 6) {
        this.device.log('[TuyaEF00Parser] Frame too short:', payload?.length);
        return null;
      }

      // Handle both Buffer and raw array
      const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

      const seq = buffer.readUInt16BE(0);
      const dpId = buffer.readUInt8(2);
      const dpType = buffer.readUInt8(3);
      const len = buffer.readUInt16BE(4);
      const data = buffer.slice(6, 6 + len);

      let value;
      switch (dpType) {
      case DP_TYPE.BOOL:
        value = data.length > 0 ? data[0] === 1 : false;
        break;
      case DP_TYPE.VALUE:
        value = data.length >= 4 ? data.readInt32BE(0) :
          data.length >= 2 ? data.readInt16BE(0) :
            data.length > 0 ? data[0] : 0;
        break;
      case DP_TYPE.STRING:
        value = data.toString('utf8');
        break;
      case DP_TYPE.ENUM:
        value = data.length > 0 ? data[0] : 0;
        break;
      case DP_TYPE.BITMAP:
        value = data.length >= 4 ? data.readUInt32BE(0) :
          data.length >= 2 ? data.readUInt16BE(0) :
            data.length > 0 ? data[0] : 0;
        break;
      case DP_TYPE.RAW:
      default:
        value = data;
        break;
      }

      this.device.log(`[TuyaEF00Parser] DP${dpId} (type=${dpType}): ${JSON.stringify(value)}`);

      // Emit event
      this.device.emit('dp', { dp: dpId, type: dpType, value, raw: data });

      return { dp: dpId, type: dpType, value, raw: data };
    } catch (err) {
      this.device.error('[TuyaEF00Parser] Parse error:', err.message);
      return null;
    }
  }

  /**
   * Parse multiple DPs from a single frame
   */
  parseMultiDP(payload) {
    const results = [];
    let offset = 0;
    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

    // Skip status/seq header if present
    if (buffer.length > 7 && buffer[0] < 10) {
      offset = 2;
    }

    while (offset + 4 <= buffer.length) {
      try {
        const dpId = buffer.readUInt8(offset);
        const dpType = buffer.readUInt8(offset + 1);
        const len = buffer.readUInt16BE(offset + 2);

        if (offset + 4 + len > buffer.length) break;

        const data = buffer.slice(offset + 4, offset + 4 + len);
        const parsed = this._parseValue(dpType, data);

        results.push({ dp: dpId, type: dpType, value: parsed, raw: data });
        this.device.emit('dp', { dp: dpId, type: dpType, value: parsed });

        offset += 4 + len;
      } catch (e) {
        break;
      }
    }

    return results;
  }

  /**
   * Parse value by type
   */
  _parseValue(dpType, data) {
    switch (dpType) {
    case DP_TYPE.BOOL:
      return data.length > 0 ? data[0] === 1 : false;
    case DP_TYPE.VALUE:
      if (data.length >= 4) return data.readInt32BE(0);
      if (data.length >= 2) return data.readInt16BE(0);
      return data.length > 0 ? data[0] : 0;
    case DP_TYPE.STRING:
      return data.toString('utf8');
    case DP_TYPE.ENUM:
      return data.length > 0 ? data[0] : 0;
    case DP_TYPE.BITMAP:
      if (data.length >= 4) return data.readUInt32BE(0);
      if (data.length >= 2) return data.readUInt16BE(0);
      return data.length > 0 ? data[0] : 0;
    default:
      return data;
    }
  }

  /**
   * Build GET frame for requesting DP value
   */
  buildGetFrame(dpId) {
    const seq = this._nextSeq();
    const payload = Buffer.alloc(7);
    payload.writeUInt8(0x00, 0);      // Status
    payload.writeUInt8(seq & 0xFF, 1); // Seq
    payload.writeUInt8(dpId, 2);       // DP ID
    payload.writeUInt8(0x00, 3);       // Type (not used for GET)
    payload.writeUInt16BE(0, 4);       // Length = 0
    return { seq, payload };
  }

  /**
   * Build SET frame for setting DP value
   */
  buildSetFrame(dpId, type, value) {
    const seq = this._nextSeq();
    const data = this._encodeValue(type, value);

    const payload = Buffer.alloc(6 + data.length);
    payload.writeUInt8(0x00, 0);           // Status
    payload.writeUInt8(seq & 0xFF, 1);     // Seq
    payload.writeUInt8(dpId, 2);           // DP ID
    payload.writeUInt8(type, 3);           // Type
    payload.writeUInt16BE(data.length, 4); // Length
    data.copy(payload, 6);                 // Data

    return { seq, payload };
  }

  /**
   * Encode value for sending
   */
  _encodeValue(type, value) {
    switch (type) {
    case DP_TYPE.BOOL:
      return Buffer.from([value ? 1 : 0]);
    case DP_TYPE.VALUE: {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(value, 0);
      return buf;
    }
    case DP_TYPE.STRING:
      return Buffer.from(String(value), 'utf8');
    case DP_TYPE.ENUM:
      return Buffer.from([value & 0xFF]);
    case DP_TYPE.BITMAP: {
      const buf = Buffer.alloc(4);
      buf.writeUInt32BE(value, 0);
      return buf;
    }
    default:
      return Buffer.isBuffer(value) ? value : Buffer.from([value]);
    }
  }

  /**
   * Get next sequence number
   */
  _nextSeq() {
    this.seq = (this.seq + 1) & 0xFFFF;
    return this.seq;
  }
}

// Export types
TuyaEF00Parser.DP_TYPE = DP_TYPE;

module.exports = TuyaEF00Parser;
