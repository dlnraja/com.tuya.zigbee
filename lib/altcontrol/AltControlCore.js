'use strict';
// P3380 (forum 21313 #296, t1013u): pure helpers for the universal "escape hatch" flow cards.
// Deterministic, no I/O. Shared by AltControlCards (runtime) and the tests.
// WHY: a user with an unsupported Tuya device must be able to read/write any DP or send a raw ZCL
// frame from a flow, and to map an unknown DP to a capability, WITHOUT waiting for a new app version.

const DP_TYPES = ['bool', 'value', 'enum', 'string', 'raw', 'bitmap'];

/** Parse a flow text value into a typed Tuya DP value. Returns { ok, value, error }. */
function parseTypedDpValue(type, input) {
  const raw = String(input == null ? '' : input).trim();
  switch (type) {
  case 'bool':
    if (!/^(true|false|0|1|on|off)$/i.test(raw)) {return { ok: false, error: 'bool expects true/false/1/0' };}
    return { ok: true, value: /^(true|1|on)$/i.test(raw) };
  case 'value': {
    const n = Number(raw);
    if (raw === '' || !Number.isFinite(n) || Math.abs(n) > 2147483647) {return { ok: false, error: 'value expects a 32-bit integer' };}
    return { ok: true, value: Math.round(n) };
  }
  case 'enum': {
    const n = Number(raw);
    if (raw === '' || !Number.isInteger(n) || n < 0 || n > 255) {return { ok: false, error: 'enum expects 0-255' };}
    return { ok: true, value: n };
  }
  case 'bitmap': {
    const n = Number(raw);
    if (raw === '' || !Number.isInteger(n) || n < 0 || n > 4294967295) {return { ok: false, error: 'bitmap expects 0-4294967295' };}
    return { ok: true, value: n };
  }
  case 'string':
    if (raw.length > 255) {return { ok: false, error: 'string longer than 255' };}
    return { ok: true, value: raw };
  case 'raw': {
    const hex = raw.replace(/\s+/g, '');
    if (!/^([0-9a-fA-F]{2}){1,64}$/.test(hex)) {return { ok: false, error: 'raw expects 1-64 hex bytes' };}
    return { ok: true, value: Buffer.from(hex, 'hex') };
  }
  default:
    return { ok: false, error: 'unknown DP type' };
  }
}

function checkDpId(dp) {
  const n = Number(dp);
  return Number.isInteger(n) && n >= 1 && n <= 255 ? n : null;
}

/** Describe a received DP value for flow tokens: { type, text, number, hex }. */
function describeDpValue(value, dpType) {
  let type = dpType || null;
  if (!type) {
    if (typeof value === 'boolean') {type = 'bool';}
    else if (typeof value === 'number') {type = 'value';}
    else if (Buffer.isBuffer(value)) {type = 'raw';}
    else if (typeof value === 'string') {type = 'string';}
    else {type = 'unknown';}
  }
  let hex = '';
  let number = 0;
  let text = '';
  if (Buffer.isBuffer(value)) {
    hex = value.subarray(0, 64).toString('hex');
    text = hex;
    if (value.length > 0 && value.length <= 4) {number = value.readUIntBE(0, value.length);}
  } else if (typeof value === 'boolean') {
    number = value ? 1 : 0; text = String(value); hex = value ? '01' : '00';
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    number = value; text = String(value);
    hex = value >= 0 && value <= 0xFFFFFFFF ? Math.round(value).toString(16).padStart(2, '0') : '';
  } else if (value != null) {
    text = String(value).slice(0, 255);
    hex = Buffer.from(text, 'utf8').subarray(0, 64).toString('hex');
  }
  return { type, text, number, hex };
}

// ---- Raw ZCL frame builder (ZCL spec 2.4.1 general frame format) -------------------------------
const ZCL_TYPES = {
  bool: { id: 0x10, size: 1 }, bitmap8: { id: 0x18, size: 1 }, bitmap16: { id: 0x19, size: 2 },
  uint8: { id: 0x20, size: 1 }, uint16: { id: 0x21, size: 2 }, uint32: { id: 0x23, size: 4 },
  int8: { id: 0x28, size: 1 }, int16: { id: 0x29, size: 2 }, int32: { id: 0x2B, size: 4 },
  enum8: { id: 0x30, size: 1 }, enum16: { id: 0x31, size: 2 },
};

function intIn(v, lo, hi) {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
}

/**
 * Build a ZCL frame buffer. opts: { frameType:'global'|'cluster', commandId, payloadHex, manufacturerCode,
 * direction:'toServer'|'toClient', seq }. Returns { ok, frame, error }.
 */
function buildZclFrame(opts = {}) {
  const cmd = intIn(opts.commandId, 0, 255);
  if (cmd === null) {return { ok: false, error: 'command id 0-255' };}
  const hex = String(opts.payloadHex || '').replace(/\s+/g, '');
  if (hex && !/^([0-9a-fA-F]{2}){1,64}$/.test(hex)) {return { ok: false, error: 'payload expects 0-64 hex bytes' };}
  const mfr = opts.manufacturerCode == null || opts.manufacturerCode === '' ? 0 : intIn(opts.manufacturerCode, 0, 0xFFFF);
  if (mfr === null) {return { ok: false, error: 'manufacturer code 0-65535' };}
  let fc = opts.frameType === 'cluster' ? 0x01 : 0x00;
  if (mfr) {fc |= 0x04;}
  if (opts.direction === 'toClient') {fc |= 0x08;}
  fc |= 0x10; // disable default response: no reply storm
  const seq = intIn(opts.seq, 0, 255) ?? 0;
  const head = mfr ? Buffer.from([fc, mfr & 0xFF, (mfr >> 8) & 0xFF, seq, cmd]) : Buffer.from([fc, seq, cmd]);
  return { ok: true, frame: Buffer.concat([head, Buffer.from(hex, 'hex')]) };
}

/** Payload hex for a global Write Attributes (0x02) record. */
function buildWriteAttributePayload(attributeId, typeName, value) {
  const attr = intIn(attributeId, 0, 0xFFFF);
  const t = ZCL_TYPES[typeName];
  if (attr === null) {return { ok: false, error: 'attribute id 0-65535' };}
  if (!t) {return { ok: false, error: 'unsupported ZCL data type' };}
  let n;
  if (typeName === 'bool') {
    if (!/^(true|false|0|1)$/i.test(String(value).trim())) {return { ok: false, error: 'bool expects true/false' };}
    n = /^(true|1)$/i.test(String(value).trim()) ? 1 : 0;
  } else {
    n = Number(String(value).trim());
    const bits = t.size * 8;
    const signed = typeName.startsWith('int');
    const lo = signed ? -(2 ** (bits - 1)) : 0;
    const hi = signed ? (2 ** (bits - 1)) - 1 : (2 ** bits) - 1;
    if (!Number.isInteger(n) || n < lo || n > hi) {return { ok: false, error: `${typeName} out of range` };}
  }
  const b = Buffer.alloc(3 + t.size);
  b.writeUInt16LE(attr, 0);
  b.writeUInt8(t.id, 2);
  if (typeName.startsWith('int')) {b.writeIntLE(n, 3, t.size);} else {b.writeUIntLE(n, 3, t.size);}
  return { ok: true, payloadHex: b.toString('hex') };
}

// ---- User DP -> capability map ---------------------------------------------------------------
// Only standard Homey capabilities (optionally with a ".suffix" sub-capability) may be ADDED at runtime.
const MAPPABLE_CAPS = new Set([
  'onoff', 'dim', 'measure_temperature', 'measure_humidity', 'measure_power', 'meter_power', 'measure_voltage',
  'measure_current', 'measure_battery', 'measure_luminance', 'measure_co2', 'measure_pm25', 'measure_pressure',
  'measure_noise', 'measure_water', 'measure_gas', 'meter_water', 'meter_gas', 'measure_tvoc',
  'alarm_contact', 'alarm_motion', 'alarm_water', 'alarm_smoke', 'alarm_co', 'alarm_generic', 'alarm_tamper',
  'alarm_battery', 'alarm_gas', 'alarm_heat', 'target_temperature', 'windowcoverings_set', 'volume_set',
]);

function normaliseCapabilityId(input) {
  const s = String(input || '').trim();
  const m = /^([a-z0-9_]{2,40})(\.[a-z0-9_]{1,16})?$/.exec(s);
  if (!m || !MAPPABLE_CAPS.has(m[1])) {return null;}
  return s;
}

/**
 * Parse a mapping spec "dp:capability[:divisor[:offset]]" (several separated by ';' or ',').
 * Example: "101:measure_temperature:10;102:alarm_contact". Returns { ok: [...], errors: [...] }.
 */
function parseDpMapSpec(spec) {
  const out = []; const errors = [];
  const parts = String(spec || '').split(/[;\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 16);
  for (const p of parts) {
    const [dpS, capS, divS, offS] = p.split(':').map((s) => (s || '').trim());
    const dp = checkDpId(dpS);
    const capability = normaliseCapabilityId(capS);
    const divisor = divS ? Number(divS) : 1;
    const offset = offS ? Number(offS) : 0;
    if (!dp || !capability || !Number.isFinite(divisor) || divisor === 0 || Math.abs(divisor) > 1e6
      || !Number.isFinite(offset) || Math.abs(offset) > 1e6) { errors.push(p.slice(0, 40)); continue; }
    out.push({ dp, capability, divisor, offset });
  }
  return { ok: out, errors };
}

/** Convert a raw DP value for a mapped capability. Returns undefined when it cannot be applied. */
function convertMappedValue(entry, value) {
  const base = entry.capability.split('.')[0];
  if (base === 'onoff' || base.startsWith('alarm_')) {
    if (typeof value === 'boolean') {return value;}
    const n = Buffer.isBuffer(value) ? value.length ? value[value.length - 1] : 0 : Number(value);
    return Number.isFinite(n) ? n !== 0 : undefined;
  }
  let n = typeof value === 'boolean' ? value ? 1 : 0
    : Buffer.isBuffer(value) ? value.length > 0 && value.length <= 4 ? value.readUIntBE(0, value.length) : NaN : Number(value);
  if (!Number.isFinite(n)) {return undefined;}
  n = n / entry.divisor + entry.offset;
  if (base === 'dim' || base === 'windowcoverings_set' || base === 'volume_set') {n = Math.max(0, Math.min(1, n));}
  return Math.round(n * 1000) / 1000;
}

/** Tiny token bucket: max `limit` actions per `windowMs` per key. */
class RateLimiter {
  constructor({ limit = 5, windowMs = 2000, now = () => Date.now() } = {}) {
    this.limit = limit; this.windowMs = windowMs; this.now = now; this.hits = new Map();
  }
  allow(key) {
    const t = this.now();
    const arr = (this.hits.get(key) || []).filter((x) => t - x < this.windowMs);
    if (arr.length >= this.limit) { this.hits.set(key, arr); return false; }
    arr.push(t); this.hits.set(key, arr);
    if (this.hits.size > 500) {this.hits.delete(this.hits.keys().next().value);}
    return true;
  }
}

module.exports = {
  DP_TYPES, ZCL_TYPES, MAPPABLE_CAPS,
  parseTypedDpValue, checkDpId, describeDpValue,
  buildZclFrame, buildWriteAttributePayload,
  normaliseCapabilityId, parseDpMapSpec, convertMappedValue, RateLimiter,
};
