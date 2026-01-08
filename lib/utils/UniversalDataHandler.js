'use strict';

/**
 * UniversalDataHandler - v5.5.389
 * Multi-Level Data Handler for Tuya & Zigbee (raw/hex/typed/semantic)
 */

// Tuya DP Types
const TUYA_DP_TYPE = { RAW: 0, BOOL: 1, VALUE: 2, STRING: 3, ENUM: 4, BITMAP: 5 };
const TUYA_DP_NAME = { 0: 'RAW', 1: 'BOOL', 2: 'VALUE', 3: 'STRING', 4: 'ENUM', 5: 'BITMAP' };

// ZCL Types
const ZCL_TYPE = {
  BOOLEAN: 0x10, UINT8: 0x20, INT8: 0x28, UINT16: 0x21, INT16: 0x29,
  UINT32: 0x23, INT32: 0x2B, FLOAT: 0x39, STRING: 0x42, ENUM8: 0x30
};

// === DATA CONVERTER ===
class DataConverter {
  static toBuffer(input) {
    if (Buffer.isBuffer(input)) return input;
    if (input instanceof Uint8Array) return Buffer.from(input);
    if (Array.isArray(input)) return Buffer.from(input);
    if (typeof input === 'string') return Buffer.from(input.replace(/[\s0x]/gi, ''), 'hex');
    if (input?.data) return this.toBuffer(input.data);
    return Buffer.alloc(0);
  }

  static toHex(input) {
    return this.toBuffer(input).toString('hex').toUpperCase().match(/.{2}/g)?.join(' ') || '';
  }

  static toArray(input) { return [...this.toBuffer(input)]; }
  static toBinary(input) { return this.toArray(input).map(b => b.toString(2).padStart(8, '0')).join(' '); }
}

// === PROTOCOL PARSER ===
class ProtocolParser {
  static parseTuyaFrame(data) {
    const buf = DataConverter.toBuffer(data);
    if (buf.length < 5) return { valid: false, error: 'Too short' };

    const frame = {
      valid: true, seqNum: buf.readUInt16BE(0), cmd: buf[2],
      dataLen: buf.readUInt16BE(3), dps: [], raw: buf
    };

    let off = 5;
    while (off + 4 <= buf.length) {
      const dp = { id: buf[off], type: buf[off + 1], typeName: TUYA_DP_NAME[buf[off + 1]], len: buf.readUInt16BE(off + 2) };
      if (off + 4 + dp.len <= buf.length) {
        dp.data = buf.slice(off + 4, off + 4 + dp.len);
        dp.hex = DataConverter.toHex(dp.data);
        dp.value = this._parseDP(dp.type, dp.data);
        frame.dps.push(dp);
      }
      off += 4 + dp.len;
    }
    return frame;
  }

  static _parseDP(type, data) {
    switch (type) {
      case 1: return data[0] === 1;
      case 2: return data.length === 4 ? data.readInt32BE(0) : data.readInt16BE(0);
      case 3: return data.toString('utf8');
      case 4: case 5: return data[0];
      default: return { hex: DataConverter.toHex(data) };
    }
  }

  static buildTuyaDP(id, type, value) {
    let valBuf;
    switch (type) {
      case 1: valBuf = Buffer.from([value ? 1 : 0]); break;
      case 2: valBuf = Buffer.alloc(4); valBuf.writeInt32BE(Math.round(value), 0); break;
      case 3: valBuf = Buffer.from(String(value), 'utf8'); break;
      case 4: case 5: valBuf = Buffer.from([value & 0xFF]); break;
      default: valBuf = DataConverter.toBuffer(value);
    }
    const dp = Buffer.alloc(4 + valBuf.length);
    dp[0] = id; dp[1] = type; dp.writeUInt16BE(valBuf.length, 2);
    valBuf.copy(dp, 4);
    return dp;
  }

  static parseZCLFrame(data) {
    const buf = DataConverter.toBuffer(data);
    if (buf.length < 3) return { valid: false };
    return {
      valid: true, frameCtrl: buf[0], seqNum: buf[1], cmd: buf[2],
      payload: buf.slice(3), raw: buf,
      isClusterSpecific: !!(buf[0] & 0x01), mfgSpecific: !!(buf[0] & 0x04)
    };
  }
}

// === TYPED READER ===
class TypedReader {
  static read(buf, type, off = 0) {
    buf = DataConverter.toBuffer(buf);
    const readers = {
      'uint8': () => buf.readUInt8(off), 'int8': () => buf.readInt8(off),
      'uint16le': () => buf.readUInt16LE(off), 'uint16be': () => buf.readUInt16BE(off),
      'int16le': () => buf.readInt16LE(off), 'int16be': () => buf.readInt16BE(off),
      'uint32le': () => buf.readUInt32LE(off), 'uint32be': () => buf.readUInt32BE(off),
      'int32le': () => buf.readInt32LE(off), 'int32be': () => buf.readInt32BE(off),
      'floatle': () => buf.readFloatLE(off), 'floatbe': () => buf.readFloatBE(off),
      'bool': () => buf[off] === 1
    };
    if (typeof type === 'string') return readers[type.toLowerCase()]?.() ?? buf.slice(off);
    // ZCL types
    if (type === ZCL_TYPE.BOOLEAN) return buf[off] === 1;
    if (type === ZCL_TYPE.UINT8) return buf.readUInt8(off);
    if (type === ZCL_TYPE.INT16) return buf.readInt16LE(off);
    if (type === ZCL_TYPE.UINT16) return buf.readUInt16LE(off);
    if (type === ZCL_TYPE.UINT32) return buf.readUInt32LE(off);
    if (type === ZCL_TYPE.FLOAT) return buf.readFloatLE(off);
    return buf.slice(off);
  }

  static write(type, value) {
    const buf = Buffer.alloc(type.includes('32') || type.includes('float') ? 4 : type.includes('16') ? 2 : 1);
    const writers = {
      'uint8': () => buf.writeUInt8(value, 0), 'int8': () => buf.writeInt8(value, 0),
      'uint16le': () => buf.writeUInt16LE(value, 0), 'uint16be': () => buf.writeUInt16BE(value, 0),
      'uint32le': () => buf.writeUInt32LE(value, 0), 'uint32be': () => buf.writeUInt32BE(value, 0),
      'int32be': () => buf.writeInt32BE(value, 0), 'floatle': () => buf.writeFloatLE(value, 0),
      'bool': () => buf.writeUInt8(value ? 1 : 0, 0)
    };
    writers[type.toLowerCase()]?.();
    return buf;
  }
}

// === SEMANTIC CONVERTER ===
class SemanticConverter {
  static convert(raw, conv) {
    const c = {
      'temp_div10': { v: raw / 10, u: '°C' }, 'temp_div100': { v: raw / 100, u: '°C' },
      'humidity': { v: raw, u: '%' }, 'humidity_div10': { v: raw / 10, u: '%' },
      'battery': { v: Math.min(100, raw), u: '%' }, 'battery_div2': { v: raw * 2, u: '%' },
      'power_div10': { v: raw / 10, u: 'W' }, 'energy_kwh': { v: raw / 100, u: 'kWh' },
      'voltage_div10': { v: raw / 10, u: 'V' }, 'percent': { v: raw, u: '%' },
      'percent_invert': { v: 100 - raw, u: '%' }, 'lux': { v: raw, u: 'lx' },
      'co2': { v: raw, u: 'ppm' }, 'pressure_div100': { v: raw / 100, u: 'hPa' }
    }[conv] || { v: raw, u: '' };
    return { value: c.v, unit: c.u, raw };
  }

  static toRaw(value, conv) {
    const inv = {
      'temp_div10': v => v * 10, 'temp_div100': v => v * 100,
      'humidity_div10': v => v * 10, 'battery_div2': v => v / 2,
      'power_div10': v => v * 10, 'energy_kwh': v => v * 100,
      'voltage_div10': v => v * 10, 'percent_invert': v => 100 - v
    }[conv] || (v => v);
    return Math.round(inv(value));
  }
}

// === MAIN UNIFIED INTERFACE ===
class UniversalDataHandler {
  // Conversion
  static toBuffer(d) { return DataConverter.toBuffer(d); }
  static toHex(d) { return DataConverter.toHex(d); }
  static toArray(d) { return DataConverter.toArray(d); }
  static toBinary(d) { return DataConverter.toBinary(d); }

  // Protocol
  static parseTuyaFrame(d) { return ProtocolParser.parseTuyaFrame(d); }
  static parseZCLFrame(d) { return ProtocolParser.parseZCLFrame(d); }
  static buildTuyaDP(id, type, val) { return ProtocolParser.buildTuyaDP(id, type, val); }

  // Typed
  static read(buf, type, off) { return TypedReader.read(buf, type, off); }
  static write(type, val) { return TypedReader.write(type, val); }

  // Semantic
  static convert(raw, conv) { return SemanticConverter.convert(raw, conv); }
  static toRaw(val, conv) { return SemanticConverter.toRaw(val, conv); }
}

module.exports = UniversalDataHandler;
module.exports.DataConverter = DataConverter;
module.exports.ProtocolParser = ProtocolParser;
module.exports.TypedReader = TypedReader;
module.exports.SemanticConverter = SemanticConverter;
module.exports.TUYA_DP_TYPE = TUYA_DP_TYPE;
module.exports.ZCL_TYPE = ZCL_TYPE;
