'use strict';

/**
 * ZclCodec — frame-level fallback parser for raw ZCL frames, independent of
 * zigbee-clusters' cluster registry. Used when a frame arrives on a cluster
 * or command we do not model. Decodes the ZCL header (ZCL spec 07-5123 §2.4),
 * the global commands (read attr resp 0x01, write resp 0x04, configure
 * reporting resp 0x07, report attributes 0x0A, default response 0x0B,
 * discover attributes resp 0x0D) and the attribute data types, including the
 * ones Tuya uses: enum8, bitmap8..64, int24/uint24, single/double float,
 * char/octet strings (short + long), array 0x48 and struct 0x4C.
 * Type table cross-checked with zigbee-herdsman's ZCL DataType enum; code
 * written from the spec.
 */

const MAX_DEPTH = 3;
const MAX_ITEMS = 64;

const T = {
  NODATA: 0x00, DATA8: 0x08, DATA16: 0x09, DATA24: 0x0a, DATA32: 0x0b,
  BOOL: 0x10, BITMAP8: 0x18, BITMAP16: 0x19, BITMAP24: 0x1a, BITMAP32: 0x1b, BITMAP64: 0x1f,
  UINT8: 0x20, UINT16: 0x21, UINT24: 0x22, UINT32: 0x23, UINT40: 0x24, UINT48: 0x25, UINT64: 0x27,
  INT8: 0x28, INT16: 0x29, INT24: 0x2a, INT32: 0x2b, INT48: 0x2d, INT64: 0x2f,
  ENUM8: 0x30, ENUM16: 0x31, SEMI: 0x38, SINGLE: 0x39, DOUBLE: 0x3a,
  OCTSTR: 0x41, CHARSTR: 0x42, LONGOCTSTR: 0x43, LONGCHARSTR: 0x44,
  ARRAY: 0x48, STRUCT: 0x4c, SET: 0x50, BAG: 0x51,
  TOD: 0xe0, DATE: 0xe1, UTC: 0xe2, CLUSTERID: 0xe8, ATTRID: 0xe9, IEEE: 0xf0, KEY128: 0xf1,
};

const FIXED = {
  [T.DATA8]: 1, [T.DATA16]: 2, [T.DATA24]: 3, [T.DATA32]: 4, [T.BOOL]: 1,
  [T.BITMAP8]: 1, [T.BITMAP16]: 2, [T.BITMAP24]: 3, [T.BITMAP32]: 4, [T.BITMAP64]: 8,
  [T.UINT8]: 1, [T.UINT16]: 2, [T.UINT24]: 3, [T.UINT32]: 4, [T.UINT40]: 5, [T.UINT48]: 6, [T.UINT64]: 8,
  [T.INT8]: 1, [T.INT16]: 2, [T.INT24]: 3, [T.INT32]: 4, [T.INT48]: 6, [T.INT64]: 8,
  [T.ENUM8]: 1, [T.ENUM16]: 2, [T.SEMI]: 2, [T.SINGLE]: 4, [T.DOUBLE]: 8,
  [T.TOD]: 4, [T.DATE]: 4, [T.UTC]: 4, [T.CLUSTERID]: 2, [T.ATTRID]: 2, [T.IEEE]: 8, [T.KEY128]: 16,
};

function _need(buf, off, n) {
  if (off + n > buf.length) {throw new RangeError(`zcl_truncated@${off}+${n}/${buf.length}`);}
}

function _halfFloat(h) {
  const s = h & 0x8000 ? -1 : 1; const e = (h >> 10) & 0x1f; const f = h & 0x3ff;
  if (e === 0) {return s * 2 ** -14 * (f / 1024);}
  if (e === 31) {return f ? NaN : s * Infinity;}
  return s * 2 ** (e - 15) * (1 + f / 1024);
}

/** Decode one value. Returns { value, next }. */
function readValue(buf, off, type, depth = 0) {
  if (depth > MAX_DEPTH) {throw new RangeError('zcl_depth');}
  switch (type) {
    case T.NODATA: return { value: null, next: off };
    case T.BOOL: _need(buf, off, 1); return { value: buf[off] === 0xff ? null : buf[off] !== 0, next: off + 1 };
    case T.INT8: _need(buf, off, 1); return { value: buf.readInt8(off), next: off + 1 };
    case T.INT16: _need(buf, off, 2); return { value: buf.readInt16LE(off), next: off + 2 };
    case T.INT24: _need(buf, off, 3); return { value: buf.readIntLE(off, 3), next: off + 3 };
    case T.INT32: _need(buf, off, 4); return { value: buf.readInt32LE(off), next: off + 4 };
    case T.INT48: _need(buf, off, 6); return { value: buf.readIntLE(off, 6), next: off + 6 };
    case T.INT64: _need(buf, off, 8); return { value: buf.readBigInt64LE(off).toString(), next: off + 8 };
    case T.UINT64: case T.BITMAP64: case T.IEEE:
      _need(buf, off, 8); return { value: type === T.IEEE ? buf.slice(off, off + 8).reverse().toString('hex') : buf.readBigUInt64LE(off).toString(), next: off + 8 };
    case T.SEMI: _need(buf, off, 2); return { value: _halfFloat(buf.readUInt16LE(off)), next: off + 2 };
    case T.SINGLE: _need(buf, off, 4); return { value: buf.readFloatLE(off), next: off + 4 };
    case T.DOUBLE: _need(buf, off, 8); return { value: buf.readDoubleLE(off), next: off + 8 };
    case T.OCTSTR: case T.CHARSTR: {
      _need(buf, off, 1); const n = buf[off];
      if (n === 0xff) {return { value: null, next: off + 1 };}
      _need(buf, off + 1, n); const b = buf.slice(off + 1, off + 1 + n);
      return { value: type === T.CHARSTR ? b.toString('utf8') : b.toString('hex'), next: off + 1 + n };
    }
    case T.LONGOCTSTR: case T.LONGCHARSTR: {
      _need(buf, off, 2); const n = buf.readUInt16LE(off);
      if (n === 0xffff) {return { value: null, next: off + 2 };}
      _need(buf, off + 2, n); const b = buf.slice(off + 2, off + 2 + n);
      return { value: type === T.LONGCHARSTR ? b.toString('utf8') : b.toString('hex'), next: off + 2 + n };
    }
    case T.ARRAY: case T.SET: case T.BAG: {
      _need(buf, off, 3); const et = buf[off]; const n = buf.readUInt16LE(off + 1); let p = off + 3;
      if (n === 0xffff) {return { value: null, next: p };}
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = readValue(buf, p, et, depth + 1); p = r.next;
        if (out.length < MAX_ITEMS) {out.push(r.value);}
      }
      return { value: out, next: p };
    }
    case T.STRUCT: {
      _need(buf, off, 2); const n = buf.readUInt16LE(off); let p = off + 2;
      if (n === 0xffff) {return { value: null, next: p };}
      const out = [];
      for (let i = 0; i < n; i++) {
        _need(buf, p, 1); const et = buf[p]; const r = readValue(buf, p + 1, et, depth + 1); p = r.next;
        if (out.length < MAX_ITEMS) {out.push({ type: et, value: r.value });}
      }
      return { value: out, next: p };
    }
    default: {
      const n = FIXED[type];
      if (!n) {throw new RangeError(`zcl_type_unknown:0x${Number(type).toString(16)}`);}
      _need(buf, off, n);
      return { value: n <= 6 ? buf.readUIntLE(off, n) : buf.slice(off, off + n).toString('hex'), next: off + n };
    }
  }
}

function parseHeader(buf) {
  _need(buf, 0, 3);
  const fc = buf[0];
  const h = {
    frameType: fc & 0x03, clusterSpecific: (fc & 0x03) === 1, manufacturerSpecific: !!(fc & 0x04),
    directionToClient: !!(fc & 0x08), disableDefaultResponse: !!(fc & 0x10),
  };
  let p = 1;
  if (h.manufacturerSpecific) { _need(buf, p, 2); h.manufacturerId = buf.readUInt16LE(p); p += 2; }
  _need(buf, p, 2); h.seq = buf[p]; h.cmdId = buf[p + 1]; p += 2;
  h.payloadOffset = p;
  return h;
}

const GLOBAL = { 0x00: 'readAttributes', 0x01: 'readAttributesResponse', 0x02: 'writeAttributes', 0x04: 'writeAttributesResponse',
  0x06: 'configureReporting', 0x07: 'configureReportingResponse', 0x0a: 'reportAttributes', 0x0b: 'defaultResponse',
  0x0c: 'discoverAttributes', 0x0d: 'discoverAttributesResponse' };

/** Parse a complete raw ZCL frame. Never throws: returns { ok:false, error } instead. */
function parseFrame(buf) {
  try {
    if (!Buffer.isBuffer(buf)) {buf = Buffer.from(buf || []);}
    const h = parseHeader(buf);
    const out = { ok: true, header: h, command: h.clusterSpecific ? 'cluster' : GLOBAL[h.cmdId] || `global_0x${h.cmdId.toString(16)}`, payload: null };
    const d = buf.slice(h.payloadOffset);
    if (h.clusterSpecific) { out.payload = { raw: d.toString('hex') }; return out; }
    let p = 0;
    switch (h.cmdId) {
      case 0x0a: { // report: id16 type8 value
        const attrs = [];
        while (p < d.length && attrs.length < MAX_ITEMS) {
          _need(d, p, 3); const id = d.readUInt16LE(p); const type = d[p + 2];
          const r = readValue(d, p + 3, type); attrs.push({ id, type, value: r.value }); p = r.next;
        }
        out.payload = { attributes: attrs }; break;
      }
      case 0x01: { // read resp: id16 status8 [type8 value]
        const attrs = [];
        while (p < d.length && attrs.length < MAX_ITEMS) {
          _need(d, p, 3); const id = d.readUInt16LE(p); const status = d[p + 2]; p += 3;
          if (status !== 0) { attrs.push({ id, status }); continue; }
          _need(d, p, 1); const type = d[p]; const r = readValue(d, p + 1, type); attrs.push({ id, status, type, value: r.value }); p = r.next;
        }
        out.payload = { attributes: attrs }; break;
      }
      case 0x04: case 0x07: { // status records
        const recs = [];
        if (d.length === 1) {recs.push({ status: d[0] });}
        else {while (p < d.length && recs.length < MAX_ITEMS) {
          _need(d, p, 1); const status = d[p];
          if (h.cmdId === 0x07) { _need(d, p, 4); recs.push({ status, direction: d[p + 1], id: d.readUInt16LE(p + 2) }); p += 4; } else { _need(d, p, 3); recs.push({ status, id: d.readUInt16LE(p + 1) }); p += 3; }
        }}
        out.payload = { records: recs }; break;
      }
      case 0x0b: _need(d, 0, 2); out.payload = { cmdId: d[0], status: d[1] }; break;
      case 0x0d: {
        _need(d, 0, 1); const attrs = []; p = 1;
        while (p + 3 <= d.length && attrs.length < MAX_ITEMS) { attrs.push({ id: d.readUInt16LE(p), type: d[p + 2] }); p += 3; }
        out.payload = { complete: d[0] === 1, attributes: attrs }; break;
      }
      default: out.payload = { raw: d.toString('hex') };
    }
    return out;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Build a default response (0x0B) for a received frame, mirroring mfr code and flipping direction. */
function buildDefaultResponse(header, status = 0x00) {
  const fc = (header.manufacturerSpecific ? 0x04 : 0) | (header.directionToClient ? 0 : 0x08) | 0x10;
  const parts = [fc];
  if (header.manufacturerSpecific) {parts.push(header.manufacturerId & 0xff, header.manufacturerId >> 8);}
  parts.push(header.seq & 0xff, 0x0b, header.cmdId & 0xff, status & 0xff);
  return Buffer.from(parts);
}

module.exports = { T, readValue, parseHeader, parseFrame, buildDefaultResponse, MAX_ITEMS, MAX_DEPTH };
