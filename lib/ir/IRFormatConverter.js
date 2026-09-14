'use strict';

/**
 * P2487 — IR format converters (Pronto / Broadlink / HEX / Global Caché → Zosung or opaque WiFi).
 * WHY: Ultimate Toolkit UX (manual paste) without Homey Sphere IR; shared by Zigbee + WiFi paths.
 * Contre quoi: Pronto paste never reaches Zosung; format guess invents garbage payloads.
 */

const NEC_HDR_MARK = 9000;
const NEC_HDR_SPACE = 4500;
const NEC_BIT_MARK = 560;
const NEC_ONE_SPACE = 1690;
const NEC_ZERO_SPACE = 560;

function necEncode(addr, cmd) {
  const bits = [];
  for (let i = 0; i < 8; i++) bits.push((addr >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push((~addr >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push((cmd >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push((~cmd >> i) & 1);
  const raw = [NEC_HDR_MARK, NEC_HDR_SPACE];
  for (const b of bits) {
    raw.push(NEC_BIT_MARK);
    raw.push(b ? NEC_ONE_SPACE : NEC_ZERO_SPACE);
  }
  raw.push(NEC_BIT_MARK);
  return raw;
}

function rawToZosungBase64(raw, freqHz = 38000) {
  const pairs = [];
  for (let i = 0; i < raw.length; i += 2) {
    pairs.push(Math.round((raw[i] || 0) / 10), Math.round((raw[i + 1] || 0) / 10));
  }
  const buf = Buffer.alloc(4 + pairs.length * 2);
  buf.writeUInt16BE(Math.round(freqHz / 100), 0);
  buf.writeUInt16BE(pairs.length, 2);
  for (let i = 0; i < pairs.length; i++) buf.writeUInt16BE(pairs[i] & 0xffff, 4 + i * 2);
  return buf.toString('base64');
}

function prontoToZosungBase64(prontoStr) {
  try {
    const parts = String(prontoStr).trim().split(/[ \t\r\n]+/).filter(Boolean);
    if (parts.length < 4 || parts[0] !== '0000') return null;
    const freqWord = parseInt(parts[1], 16);
    if (!Number.isFinite(freqWord) || freqWord <= 0) return null;
    const freqHz = Math.round(1000000 / (freqWord * 0.241246));
    const cycleUs = 1000000 / freqHz;
    const seq1Len = parseInt(parts[2], 16);
    const seq2Len = parseInt(parts[3], 16);
    const totalPairs = seq1Len + seq2Len;
    if (!Number.isFinite(totalPairs) || totalPairs <= 0) return null;
    const buf = Buffer.alloc(4 + totalPairs * 4);
    buf.writeUInt16BE(Math.round(freqHz / 100), 0);
    buf.writeUInt16BE(totalPairs * 2, 2);
    let offset = 4;
    for (let i = 4; i < 4 + totalPairs * 2; i++) {
      const val = parseInt(parts[i], 16);
      if (!Number.isFinite(val)) return null;
      buf.writeUInt16BE(Math.round((val * cycleUs) / 10), offset);
      offset += 2;
    }
    return buf.toString('base64');
  } catch (_) {
    return null;
  }
}

function broadlinkToZosungBase64(blStr) {
  try {
    const buf = Buffer.from(String(blStr).trim(), 'base64');
    if (buf.length < 5 || buf[0] !== 0x26) return null;
    const raw = [];
    let i = 4;
    while (i < buf.length) {
      if (buf[i] === 0x00) {
        if (i + 2 >= buf.length) break;
        raw.push((buf.readUInt16BE(i + 1) * 269) / 8192 * 1000);
        i += 3;
      } else {
        raw.push((buf[i] * 269) / 8192 * 1000);
        i += 1;
      }
    }
    if (raw.length % 2 !== 0) raw.push(1000);
    if (raw.length < 2) return null;
    return rawToZosungBase64(raw);
  } catch (_) {
    return null;
  }
}

/** Global Caché sendir-style: often comma/space separated µs timings after optional header. */
function globalCacheToZosungBase64(gcStr) {
  try {
    let s = String(gcStr).trim();
    // sendir,1:1,0,<freq>,1,1,<mark>,<space>,...
    if (/^sendir,/i.test(s)) {
      const parts = s.split(',');
      const freq = parseInt(parts[3], 10) || 38000;
      const timings = parts.slice(6).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0);
      if (timings.length < 2) return null;
      if (timings.length % 2 !== 0) timings.push(1000);
      return rawToZosungBase64(timings, freq);
    }
    // bare "mark,space,..." or space-separated
    const timings = s.split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0);
    if (timings.length < 4) return null;
    if (timings.length % 2 !== 0) timings.push(1000);
    return rawToZosungBase64(timings);
  } catch (_) {
    return null;
  }
}

function hexTimingToZosungBase64(hexStr) {
  try {
    const cleaned = String(hexStr).replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length < 8 || cleaned.length % 4 !== 0) return null;
    const raw = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      raw.push(parseInt(cleaned.slice(i, i + 4), 16));
    }
    if (raw.length < 2) return null;
    if (raw.length % 2 !== 0) raw.push(1000);
    return rawToZosungBase64(raw);
  } catch (_) {
    return null;
  }
}

function looksLikeBase64(s) {
  return /^[A-Za-z0-9+/=]+$/.test(s) && s.length >= 8 && s.length % 4 === 0;
}

function looksLikeZosungBase64(s) {
  if (!looksLikeBase64(s)) return false;
  try {
    const buf = Buffer.from(s, 'base64');
    return buf.length >= 8;
  } catch (_) {
    return false;
  }
}

/**
 * Guess input format from string shape.
 * @returns {'pronto'|'broadlink'|'globalcache'|'hex'|'zosung'|'tuya_opaque'|'unknown'}
 */
function detectFormat(input) {
  const s = String(input || '').trim();
  if (!s) return 'unknown';
  if (/^0000\s/i.test(s) || /^0000[0-9a-fA-F\s]+$/.test(s.replace(/\s+/g, ' '))) return 'pronto';
  if (/^sendir,/i.test(s)) return 'globalcache';
  if (/^Jg/i.test(s) || /^2600/i.test(s.replace(/\s/g, ''))) return 'broadlink';
  if (/^[0-9a-fA-F,\s]+$/.test(s) && s.split(/[,\s]+/).filter(Boolean).length >= 4 && !looksLikeBase64(s.replace(/\s/g, ''))) {
    return 'globalcache';
  }
  if (/^[0-9a-fA-F\s]+$/.test(s) && s.replace(/\s/g, '').length >= 8) return 'hex';
  if (looksLikeZosungBase64(s)) return 'zosung';
  // Tuya WiFi often stores opaque / base64-ish without Zosung header semantics
  if (looksLikeBase64(s) || s.length > 16) return 'tuya_opaque';
  return 'unknown';
}

/**
 * Normalize any manual paste for a target transport.
 * @param {string} input
 * @param {{ format?: string, target?: 'zigbee'|'wifi' }} [opts]
 * @returns {{ ok: boolean, format: string, code: string|null, zigbeeCode: string|null, wifiCode: string|null, error?: string }}
 */
function normalizeCode(input, opts = {}) {
  const target = opts.target === 'wifi' ? 'wifi' : 'zigbee';
  const s = String(input || '').trim();
  if (!s) {
    return { ok: false, format: 'unknown', code: null, zigbeeCode: null, wifiCode: null, error: 'empty' };
  }
  const format = opts.format && opts.format !== 'auto' ? opts.format : detectFormat(s);

  let zigbeeCode = null;
  if (format === 'pronto') zigbeeCode = prontoToZosungBase64(s);
  else if (format === 'broadlink') zigbeeCode = broadlinkToZosungBase64(s);
  else if (format === 'globalcache') zigbeeCode = globalCacheToZosungBase64(s);
  else if (format === 'hex') zigbeeCode = hexTimingToZosungBase64(s);
  else if (format === 'zosung') zigbeeCode = looksLikeZosungBase64(s) ? s : null;
  else if (format === 'tuya_opaque') {
    // Opaque: WiFi can send as-is; Zigbee only if it already looks like Zosung
    zigbeeCode = looksLikeZosungBase64(s) ? s : null;
  }

  const wifiCode = s; // WiFi path keeps opaque string (Tuya DP201)

  if (target === 'zigbee') {
    if (!zigbeeCode) {
      return {
        ok: false,
        format,
        code: null,
        zigbeeCode: null,
        wifiCode,
        error: `cannot convert ${format} to Zosung for Zigbee blaster`,
      };
    }
    return { ok: true, format, code: zigbeeCode, zigbeeCode, wifiCode };
  }

  return { ok: true, format, code: wifiCode, zigbeeCode, wifiCode };
}

/**
 * Shared learned-code store entry (device store).
 */
function makeLearnedEntry({ name, code, format, protocol, carrier, icon }) {
  const n = String(name || '').trim();
  if (!n) throw new Error('learned code name required');
  if (!code) throw new Error('learned code payload required');
  return {
    name: n,
    code: String(code),
    format: format || detectFormat(code),
    protocol: protocol || null,
    carrier: carrier || null,
    icon: icon || null,
    updatedAt: Date.now(),
  };
}

function upsertLearnedMap(map, entry) {
  const out = { ...(map || {}) };
  out[entry.name] = entry;
  return out;
}

function listLearned(map) {
  return Object.values(map || {}).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

module.exports = {
  necEncode,
  rawToZosungBase64,
  prontoToZosungBase64,
  broadlinkToZosungBase64,
  globalCacheToZosungBase64,
  hexTimingToZosungBase64,
  detectFormat,
  normalizeCode,
  makeLearnedEntry,
  upsertLearnedMap,
  listLearned,
  looksLikeZosungBase64,
};
