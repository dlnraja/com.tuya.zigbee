'use strict';

const fs = require('fs');
const path = require('path');
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

const IRDB_PATH = path.join(__dirname, 'irdb-codes.json');
const INDEX_PATH = path.join(__dirname, 'irdb-index.json');

const BUILTIN_CODES = {
  'Samsung': {
    'TV': {
      'Power': { proto: 'Samsung', addr: 0x07, cmd: 0x02 },
      'Volume Up': { proto: 'Samsung', addr: 0x07, cmd: 0x07 },
      'Volume Down': { proto: 'Samsung', addr: 0x07, cmd: 0x0B },
      'Mute': { proto: 'Samsung', addr: 0x07, cmd: 0x0F }
    }
  },
  'LG': {
    'TV': {
      'Power': { proto: 'NEC', addr: 0x04, cmd: 0x08 },
      'Volume Up': { proto: 'NEC', addr: 0x04, cmd: 0x02 },
      'Volume Down': { proto: 'NEC', addr: 0x04, cmd: 0x03 }
    }
  }
};

const NEC_HDR_MARK = 9000, NEC_HDR_SPACE = 4500, NEC_BIT_MARK = 560;
const NEC_ONE_SPACE = 1690, NEC_ZERO_SPACE = 560;

function necEncode(addr, cmd) {
  const bits = [];
  for (let i = 0; i < 8; i++) bits.push((addr >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push(((~addr) >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push((cmd >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push(((~cmd) >> i) & 1);
  const raw = [NEC_HDR_MARK, NEC_HDR_SPACE];
  for (const b of bits) {
    raw.push(NEC_BIT_MARK);
    raw.push(b ? NEC_ONE_SPACE : NEC_ZERO_SPACE);
  }
  raw.push(NEC_BIT_MARK);
  return raw;
}

function samsungEncode(addr, cmd) {
  const bits = [];
  for (let i = 0; i < 8; i++) bits.push((addr >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push((addr >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push((cmd >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push(((~cmd) >> i) & 1);
  const raw = [4500, 4500];
  for (const b of bits) { raw.push(560); raw.push(b ? 1690 : 560); }
  raw.push(560);
  return raw;
}

function sonyEncode(addr, cmd) {
  const raw = [2400, 600];
  for (let i = 0; i < 7; i++) { raw.push((cmd >> i) & 1 ? 1200 : 600); raw.push(600); }
  for (let i = 0; i < 5; i++) { raw.push((addr >> i) & 1 ? 1200 : 600); raw.push(600); }
  return raw;
}

function rawToBase64(raw) {
  const freq = 38000;
  const pairs = [];
  for (let i = 0; i < raw.length; i += 2) {
    const mark = Math.round((raw[i] || 0) / 10);
    const space = Math.round((raw[i + 1] || 0) / 10);
    pairs.push(mark, space);
  }
  const buf = Buffer.alloc(4 + (pairs.length * 2));
  buf.writeUInt16BE(Math.round(freq), 0);
  buf.writeUInt16BE(pairs.length, 2);
  for (let i = 0; i < pairs.length; i++) {
    buf.writeUInt16BE(pairs[i] & 0xFFFF, 4 + (i * 2));
  }
  return buf.toString('base64');
}

class IRCodeLibrary {
  constructor() {
    this._irdb = null;
    this._index = null;
    this._loaded = false;
  }

  load() {
    if (this._loaded) return;
    try {
      if (fs.existsSync(IRDB_PATH)) {
        this._irdb = JSON.parse(fs.readFileSync(IRDB_PATH, 'utf8'));
        this._index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
      }
    } catch (e) {}
    this._loaded = true;
  }

  getBrands(category) {
    this.load();
    const brands = new Set(Object.keys(BUILTIN_CODES));
    if (this._index) {
      const list = category ? this._index.byCategory[category] : this._index.brands;
      if (list) list.forEach(b => brands.add(b));
    }
    return [...brands].sort();
  }

  getCode(brand, category, fn) {
    this.load();
    const builtin = BUILTIN_CODES[brand]?.[category]?.[fn];
    if (builtin) {
      let raw = null;
      if (builtin.proto === 'NEC') raw = necEncode(builtin.addr, builtin.cmd);
      else if (builtin.proto === 'Samsung') raw = samsungEncode(builtin.addr, builtin.cmd);
      else if (builtin.proto === 'Sony') raw = sonyEncode(builtin.addr, builtin.cmd);
      if (raw) return { source: 'builtin', protocol: builtin.proto, code: rawToBase64(raw), raw };
    }
    return null;
  }
}

module.exports = new IRCodeLibrary();
