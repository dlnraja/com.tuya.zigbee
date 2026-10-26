'use strict';

/**
 * P3063 — Zosung / Tuya IR protocol helpers (pure, no Homey dependency).
 *
 * WHY: the 0xED00 chunk transfer and the Tuya "key_code" timing format were
 * re-implemented here from the public protocol descriptions so they can be
 * unit-tested without a device. Our own code; behaviour cross-checked against:
 *  - zigbee-herdsman-converters src/lib/zosung.ts (Koenkk & contributors, MIT):
 *    frame layout, CRC rules, Code00 resend, ZG-IR01 seq 0, serial queue.
 *  - mildsunrise "tuya-ir" notes (FastLZ level-1 style compression of LE u16 µs timings).
 *  - tinytuya IRRemoteControlDevice (Wi-Fi IR uses the same timings, uncompressed).
 */

const CHUNK_TX_MAX = 0x32;        // Z2M sends at most 50 chars per Code03
const CHUNK_RX_REQUEST = 0x38;    // Z2M asks 56 bytes per Code02 when learning
const MAX_LEARN_BYTES = 8192;     // bounded RX buffer (real codes are < 1.5 KB)
const MAX_TX_MESSAGE = 16384;     // bounded TX JSON
const MAX_TIMINGS = 4096;
const WINDOW = 8192;              // 13-bit back-reference distance (decoder limit)
const SEARCH_WINDOW = 1024;       // encoder search bound — keeps compression O(n·1K)

// ---------------------------------------------------------------- CRC
function calcStringCrc(str) {
  let s = 0;
  const t = String(str || '');
  for (let i = 0; i < t.length; i++) {s = (s + t.charCodeAt(i)) % 0x100;}
  return s;
}

function calcArrayCrc(buf) {
  let s = 0;
  if (!buf) {return 0;}
  for (let i = 0; i < buf.length; i++) {s = (s + (buf[i] & 0xff)) % 0x100;}
  return s;
}

// ---------------------------------------------------------------- timings codec
function _timingsToBytes(timings) {
  if (!Array.isArray(timings) || timings.length === 0) {throw new Error('timings must be a non-empty array');}
  if (timings.length > MAX_TIMINGS) {throw new Error(`too many timings (${timings.length} > ${MAX_TIMINGS})`);}
  const raw = Buffer.alloc(timings.length * 2);
  for (let i = 0; i < timings.length; i++) {
    const v = Math.abs(Math.trunc(Number(timings[i])));
    if (!Number.isFinite(v) || v > 0xffff) {throw new Error(`invalid timing at ${i}: ${timings[i]}`);}
    raw.writeUInt16LE(v, i * 2);
  }
  return raw;
}

function _emitLiterals(out, src, from, to) {
  let p = from;
  while (p < to) {
    const n = Math.min(32, to - p);
    out.push((n - 1) & 0x1f);
    for (let i = 0; i < n; i++) {out.push(src[p + i]);}
    p += n;
  }
}

/**
 * Compress raw bytes with the Tuya/FastLZ-1 block format.
 * literal: [000LLLLL] + (L+1) bytes
 * match:   [LLLDDDDD] (+ ext len byte when LLL==7) + [DDDDDDDD]; len = LLL+2 (+ext), dist = D+1
 * level 0 (default) = literals only — what Z2M and the HA Tuya integration emit;
 * WHY: HA notes some cheap Tuya IR chips misbehave on back-references, so TX stays level 0.
 * level 1 = greedy matches (shorter frames, opt-in only).
 */
function compressTuyaBytes(raw, { level = 0 } = {}) {
  const src = Buffer.isBuffer(raw) ? raw : Buffer.from(raw || []);
  const out = [];
  if (level <= 0) {
    _emitLiterals(out, src, 0, src.length);
    return Buffer.from(out);
  }
  let litStart = 0;
  let i = 0;
  while (i < src.length) {
    let bestLen = 0;
    let bestDist = 0;
    const minJ = Math.max(0, i - Math.min(WINDOW, SEARCH_WINDOW));
    for (let j = i - 1; j >= minJ; j--) {
      let l = 0;
      while (i + l < src.length && src[j + l] === src[i + l] && l < 263) {l++;}
      if (l > bestLen) {bestLen = l; bestDist = i - j; if (l >= 263) {break;}}
    }
    if (bestLen >= 3) {
      _emitLiterals(out, src, litStart, i);
      const d = bestDist - 1;
      const lenCode = bestLen - 2;
      if (lenCode < 7) {
        out.push((lenCode << 5) | (d >> 8), d & 0xff);
      } else {
        out.push((7 << 5) | (d >> 8), lenCode - 7, d & 0xff);
      }
      i += bestLen;
      litStart = i;
    } else {
      i++;
    }
  }
  _emitLiterals(out, src, litStart, src.length);
  return Buffer.from(out);
}

/** Inverse of compressTuyaBytes. Throws on malformed input (callers decide on fallback). */
function decompressTuyaBytes(input) {
  const c = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  const out = [];
  let p = 0;
  while (p < c.length) {
    const h = c[p++];
    const type = h >> 5;
    if (type === 0) {
      const n = (h & 0x1f) + 1;
      if (p + n > c.length) {throw new Error('truncated literal');}
      for (let k = 0; k < n; k++) {out.push(c[p++]);}
    } else {
      let len = type + 2;
      if (type === 7) {
        // extended length: each 0xFF adds 255, then one remainder byte (Z2M / HA decoders)
        while (p < c.length && c[p] === 0xff) {len += 255; p++;}
        if (p >= c.length) {throw new Error('truncated length');}
        len += c[p++];
      }
      if (p >= c.length) {throw new Error('truncated distance');}
      const dist = (((h & 0x1f) << 8) | c[p++]) + 1;
      if (dist > out.length) {throw new Error('invalid back-reference');}
      for (let k = 0; k < len; k++) {out.push(out[out.length - dist]);}
    }
    if (out.length > MAX_TIMINGS * 2) {throw new Error('decoded payload too large');}
  }
  return Buffer.from(out);
}

function encodeTuyaTimings(timings, opts = {}) {
  return compressTuyaBytes(_timingsToBytes(timings), opts).toString('base64');
}

/** @returns {number[]} positive µs durations (mark, space, mark, …) */
function decodeTuyaTimings(base64OrBuf) {
  const buf = Buffer.isBuffer(base64OrBuf) ? base64OrBuf : Buffer.from(String(base64OrBuf || ''), 'base64');
  const raw = decompressTuyaBytes(buf);
  if (raw.length < 2 || raw.length % 2) {throw new Error('decoded length not u16-aligned');}
  const t = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {t.push(raw.readUInt16LE(i));}
  return t;
}

/** Strict check: decodes, ≥ 4 timings, all plausible IR durations (≥ 50 µs, ≤ 65535). */
function isTuyaCompressedCode(base64) {
  try {
    const t = decodeTuyaTimings(base64);
    if (t.length < 4) {return false;}
    let tiny = 0;
    for (const v of t) {if (v < 50) {tiny++;}}
    return tiny <= Math.ceil(t.length * 0.05);
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------- Wi-Fi (uncompressed) format
/** tinytuya / tuya-local: base64 of plain LE u16 µs pulses. */
function timingsToWifiBase64(timings) {
  return _timingsToBytes(timings).toString('base64');
}

function wifiBase64ToTimings(b64) {
  let s = String(b64 || '').trim();
  // WHY: tinytuya strips a leading "1" marker when length % 4 == 1
  if (s.length % 4 === 1 && s.startsWith('1')) {s = s.slice(1);}
  const raw = Buffer.from(s, 'base64');
  if (raw.length < 4 || raw.length % 2) {throw new Error('not a Wi-Fi pulse code');}
  const t = [];
  for (let i = 0; i < raw.length; i += 2) {t.push(raw.readUInt16LE(i));}
  return t;
}

// ---------------------------------------------------------------- message normalization
function _wrap(keyCode, { freq = 38000, num = 1, type = 1, delay = 300 } = {}) {
  return JSON.stringify({ key_num: 1, delay, key1: { num, freq, type, key_code: keyCode } });
}

function _fromObject(o) {
  if (Array.isArray(o.timings)) {
    const mod = o.modulation ?? o.freq ?? 38000;
    if (typeof mod !== 'number' || mod <= 30000) {throw new Error('invalid modulation frequency');}
    return _wrap(encodeTuyaTimings(o.timings), { freq: mod, num: 1 + (Number(o.repeat_count) || 0) });
  }
  if (o.key_num !== undefined && o.key1 !== undefined) {return JSON.stringify(o);}
  if (o.key_code !== undefined) {
    return _wrap(o.key_code, { freq: o.freq ?? 38000, num: o.num ?? 1, type: o.type ?? 1, delay: o.delay ?? 300 });
  }
  return null;
}

/**
 * Build the JSON message sent over 0xED00. Accepts a bare key_code (base64),
 * a JSON string / object with key_num+key1, key_code, or timings[].
 */
function normalizeIrMsg(value, opts = {}) {
  if (value === undefined || value === null || value === '') {throw new Error('IR code payload is empty');}
  let msg = null;
  if (typeof value === 'object' && !Buffer.isBuffer(value)) {
    msg = _fromObject(value) || JSON.stringify(value);
  } else {
    const s = Buffer.isBuffer(value) ? value.toString('base64') : String(value).trim();
    if (!s) {throw new Error('IR code payload is empty');}
    if (s.startsWith('{') && s.endsWith('}')) {
      try { msg = _fromObject(JSON.parse(s)); } catch (e) { msg = null; }
    }
    if (!msg) {msg = _wrap(s, { freq: opts.frequency || 38000 });}
  }
  if (msg.length > MAX_TX_MESSAGE) {throw new Error(`IR message too large (${msg.length})`);}
  return msg;
}

// ---------------------------------------------------------------- seq + queue
function isZeroSeqModel(modelId) {
  return String(modelId || '').toUpperCase() === 'ZG-IR01';
}

function nextSeq(prev, modelId) {
  if (isZeroSeqModel(modelId)) {return 0;}
  const p = Number.isInteger(prev) ? prev : -1;
  return (p + 1) % 0x10000;
}

function txChunk(message, position, maxlen) {
  const pos = Math.max(0, Number(position) || 0);
  const ml = Math.min(CHUNK_TX_MAX, Math.max(1, Number(maxlen) || CHUNK_TX_MAX));
  const part = String(message || '').substring(pos, pos + ml);
  return { part, msgpart: Buffer.from(part, 'latin1'), msgpartcrc: calcStringCrc(part) };
}

/**
 * Accept a Code03 from either a fixed parser (msgpart + msgpartcrc) or a
 * legacy/raw one (msgpart = [len][bytes][crc] or [bytes][crc]).
 * @returns {{chunk: Buffer, crc: number|undefined}}
 */
function parseRxChunk(data) {
  let chunk = data && (data.msgpart ?? data.data);
  if (chunk === undefined || chunk === null) {return { chunk: Buffer.alloc(0), crc: undefined };}
  if (!Buffer.isBuffer(chunk)) {chunk = Buffer.from(chunk);}
  if (data.msgpartcrc !== undefined) {return { chunk, crc: data.msgpartcrc };}
  // Tolerant legacy shapes: [len][bytes...][crc] or [bytes...][crc]; keep the one whose CRC matches
  const cands = [];
  if (chunk.length >= 3 && chunk[0] === chunk.length - 2) {cands.push(chunk.slice(1, -1));}
  if (chunk.length >= 2) {cands.push(chunk.slice(0, -1));}
  if (cands.length) {
    const crc = chunk[chunk.length - 1];
    const hit = cands.find((c) => calcArrayCrc(c) === crc);
    return { chunk: hit || cands[0], crc };
  }
  return { chunk, crc: undefined };
}

// Global serial queue: simultaneous Zosung transfers stall the devices (Z2M observation)
let _queue = Promise.resolve();
function runQueued(task) {
  const run = _queue.then(() => task());
  _queue = run.catch(() => {});
  return run;
}

module.exports = {
  CHUNK_TX_MAX,
  CHUNK_RX_REQUEST,
  MAX_LEARN_BYTES,
  MAX_TX_MESSAGE,
  calcStringCrc,
  calcArrayCrc,
  compressTuyaBytes,
  decompressTuyaBytes,
  encodeTuyaTimings,
  decodeTuyaTimings,
  isTuyaCompressedCode,
  timingsToWifiBase64,
  wifiBase64ToTimings,
  normalizeIrMsg,
  isZeroSeqModel,
  nextSeq,
  txChunk,
  parseRxChunk,
  runQueued,
};
