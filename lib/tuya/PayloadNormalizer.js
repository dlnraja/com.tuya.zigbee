'use strict';

/**
 * P2972 — PayloadNormalizer: turn any "shape" of a Tuya DP payload into a Buffer, then into DP records.
 *
 * WHY: diags, forum posts, Z2M logs and some firmware hand us the same bytes in different forms
 * (raw Buffer, byte array, hex with or without separators, base64, COBS-framed serial dumps,
 * length-prefixed blobs), and numeric DP values in big-endian (Tuya standard) or little-endian
 * (a few OEM firmwares / raw-type DPs). Everything here is pure, additive and never throws on
 * bad input: it returns null instead.
 *
 * Interpretation of "cobsyrain decoding" (owner request, no other source found in the repo,
 * forum or issues): COBS = Consistent Overhead Byte Stuffing (Cheshire & Baker, IEEE/ACM ToN 1999),
 * used to frame serial dumps; "rain" = Tuya rain-sensor DPs (see RainDpDecoder.js). Own code.
 */

/** COBS decode. Accepts a frame with or without the trailing 0x00 delimiter. */
function cobsDecode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  let end = buf.length;
  if (end && buf[end - 1] === 0x00) {end -= 1;}
  const out = [];
  let i = 0;
  while (i < end) {
    const code = buf[i];
    if (code === 0) {return null;} // zero inside a COBS frame = not COBS
    i += 1;
    for (let k = 1; k < code; k++) {
      if (i >= end) {return null;} // truncated block
      out.push(buf[i++]);
    }
    if (code < 0xFF && i < end) {out.push(0x00);}
  }
  return Buffer.from(out);
}

/** COBS encode (adds the trailing 0x00 delimiter). Used by tests and tools. */
function cobsEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  const out = [0];
  let codeIdx = 0;
  let code = 1;
  for (const b of buf) {
    if (b === 0) {
      out[codeIdx] = code; codeIdx = out.length; out.push(0); code = 1;
    } else {
      out.push(b); code += 1;
      if (code === 0xFF) { out[codeIdx] = code; codeIdx = out.length; out.push(0); code = 1; }
    }
  }
  out[codeIdx] = code;
  out.push(0x00);
  return Buffer.from(out);
}

const HEX_RE = /^(?:0x)?[0-9a-f]+$/i;
const B64_RE = /^[A-Za-z0-9+/_-]+={0,2}$/;

/**
 * Any input -> Buffer (or null). Order: Buffer/typed array/array -> {type:'Buffer',data} ->
 * "cobs:"/"hex:"/"b64:" prefixed strings -> hex (separators allowed) -> base64.
 */
function toBuffer(input) {
  if (input == null) {return null;}
  if (Buffer.isBuffer(input)) {return input;}
  if (input instanceof Uint8Array) {return Buffer.from(input);}
  if (Array.isArray(input)) {
    return input.every((b) => Number.isInteger(b) && b >= 0 && b <= 255) ? Buffer.from(input) : null;
  }
  if (typeof input === 'object' && input.type === 'Buffer' && Array.isArray(input.data)) {return toBuffer(input.data);}
  if (typeof input !== 'string') {return null;}
  const s = input.trim();
  if (!s) {return null;}
  const m = /^(cobs|hex|b64|base64):/i.exec(s);
  if (m) {
    const kind = m[1].toLowerCase();
    const rest = s.slice(m[0].length);
    if (kind === 'cobs') { const raw = toBuffer(rest); return raw ? cobsDecode(raw) : null; }
    if (kind === 'hex') {return hexToBuffer(rest);}
    return b64ToBuffer(rest);
  }
  const hex = hexToBuffer(s);
  if (hex) {return hex;}
  return b64ToBuffer(s);
}

function hexToBuffer(s) {
  const compact = String(s).replace(/0x/gi, '').replace(/[\s:,\-_]/g, '');
  if (!compact || compact.length % 2 || !HEX_RE.test(compact)) {return null;}
  return Buffer.from(compact, 'hex');
}

function b64ToBuffer(s) {
  const t = String(s).replace(/\s+/g, '');
  if (!t || !B64_RE.test(t) || t.length < 2) {return null;}
  const buf = Buffer.from(t.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return buf.length ? buf : null;
}

/** Strip a 1- or 2-byte (BE or LE) length prefix when it exactly matches the rest. */
function stripLengthPrefix(buf) {
  if (!buf || buf.length < 2) {return buf;}
  if (buf[0] === buf.length - 1) {return buf.subarray(1);}
  if (buf.length >= 3) {
    if (buf.readUInt16BE(0) === buf.length - 2) {return buf.subarray(2);}
    if (buf.readUInt16LE(0) === buf.length - 2) {return buf.subarray(2);}
  }
  return buf;
}

const TYPE = { RAW: 0, BOOL: 1, VALUE: 2, STRING: 3, ENUM: 4, BITMAP: 5 };

/** Parse Tuya DP records [dp(1) type(1) len(2) value]. Length BE (spec), LE as a fallback. */
function parseDpRecords(buf, offset = 0) {
  if (!buf) {return null;}
  const tryParse = (le) => {
    const recs = [];
    let i = offset;
    while (i + 4 <= buf.length) {
      const dp = buf[i];
      const type = buf[i + 1];
      const len = le ? buf.readUInt16LE(i + 2) : buf.readUInt16BE(i + 2);
      if (type > 5 || i + 4 + len > buf.length) {return null;}
      const data = buf.subarray(i + 4, i + 4 + len);
      recs.push({ dp, type, length: len, data, value: decodeDpValue(type, data) });
      i += 4 + len;
    }
    return i === buf.length && recs.length ? recs : null;
  };
  return tryParse(false) || tryParse(true);
}

/**
 * Decode a value by Tuya type. VALUE is 4-byte signed BE per spec; bitmaps/raw of 1-4 bytes
 * are read BE. Use readNumber(..., {endian:'le'}) when a firmware is known to be LE.
 */
function decodeDpValue(type, data) {
  switch (type) {
    case TYPE.BOOL: return data.length ? data[0] !== 0 : false;
    case TYPE.VALUE: return data.length === 4 ? data.readInt32BE(0) : readNumber(data);
    case TYPE.STRING: return data.toString('utf8');
    case TYPE.ENUM: return data.length ? data[0] : null;
    case TYPE.BITMAP: return readNumber(data);
    default: return data;
  }
}

/** Unsigned int from 1..4 bytes (or 1..6 via readUIntXX). endian: 'be' (default) or 'le'. */
function readNumber(data, { endian = 'be', signed = false } = {}) {
  const b = toBuffer(data);
  if (!b || !b.length || b.length > 6) {return null;}
  if (endian === 'le') {return signed ? b.readIntLE(0, b.length) : b.readUIntLE(0, b.length);}
  return signed ? b.readIntBE(0, b.length) : b.readUIntBE(0, b.length);
}

/**
 * Best effort "give me a number" for DP handlers: numbers, numeric strings, booleans,
 * Buffers / hex / base64 / arrays (BE unless endian:'le'; if BE is absurd > max and LE fits, use LE).
 */
function toNumber(v, { endian, max } = {}) {
  if (typeof v === 'number') {return Number.isFinite(v) ? v : null;}
  if (typeof v === 'boolean') {return v ? 1 : 0;}
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) {return Number(v);}
  const b = toBuffer(v);
  if (!b || !b.length || b.length > 6) {return null;}
  if (endian) {return readNumber(b, { endian });}
  const be = readNumber(b, { endian: 'be' });
  if (max != null && be > max) {
    const le = readNumber(b, { endian: 'le' });
    if (le <= max) {return le;}
  }
  return be;
}

/**
 * Full pipeline: any input -> {buffer, framing[], records|null}.
 * Tries: as-is, COBS, length-prefixed, Tuya EF00 command header (status+seq = 2 bytes, seq-only =
 * 2 bytes in Homey cluster payloads), returning the first that yields valid DP records.
 */
function normalizePayload(input) {
  const base = toBuffer(input);
  if (!base) {return null;}
  const candidates = [{ buf: base, framing: ['raw'] }];
  if (base.length && base[base.length - 1] === 0x00) {
    const c = cobsDecode(base);
    if (c) {candidates.push({ buf: c, framing: ['cobs'] });}
  }
  for (const c of candidates.slice()) {
    const s = stripLengthPrefix(c.buf);
    if (s !== c.buf) {candidates.push({ buf: s, framing: [...c.framing, 'length-prefixed'] });}
  }
  for (const c of candidates) {
    let recs = parseDpRecords(c.buf);
    if (recs) {return { buffer: c.buf, framing: c.framing, records: recs };}
    recs = parseDpRecords(c.buf, 2); // seq(2) header
    if (recs) {return { buffer: c.buf, framing: [...c.framing, 'seq-header'], records: recs };}
  }
  return { buffer: base, framing: ['raw'], records: null };
}

module.exports = {
  TYPE,
  cobsDecode,
  cobsEncode,
  toBuffer,
  hexToBuffer,
  b64ToBuffer,
  stripLengthPrefix,
  parseDpRecords,
  decodeDpValue,
  readNumber,
  toNumber,
  normalizePayload,
};
