'use strict';

// Pure value codec for TuyaDpProfileDevice profiles (kept free of Homey imports so it is testable).
const COVER_TO_DP = { up: 0, idle: 1, down: 2 };
const COVER_FROM_DP = { 0: 'up', 1: 'idle', 2: 'down' };

function toScalar(raw) {
  if (Buffer.isBuffer(raw)) { return raw.length ? raw.readUIntBE(0, Math.min(raw.length, 6)) : null; }
  return raw === undefined ? null : raw;
}

function decodeBuiltin(def, raw) {
  const v = toScalar(raw);
  if (v === null) { return null; }
  switch (def.kind) {
    case 'bool': return v === true || v === 1 || v === '1';
    case 'presence': return Number(v) === 1;
    case 'inSet': return Array.isArray(def.set) && def.set.includes(Number(v));
    case 'coverState': return COVER_FROM_DP[Number(v)] ?? null;
    // P3039: Tuya enum <-> capability id through an explicit map ({ 0: 'cool', 1: 'heat' }); unknown raw values are ignored.
    case 'enum': return def.map && Object.prototype.hasOwnProperty.call(def.map, Number(v)) ? def.map[Number(v)] : null;
    case 'coverPos': {
      const n = Math.max(0, Math.min(100, Number(v)));
      return Number.isFinite(n) ? (def.invert ? 100 - n : n) / 100 : null;
    }
    default: {
      const n = Number(v);
      return Number.isFinite(n) ? n / (def.divisor || 1) : null;
    }
  }
}

function encodeBuiltin(def, v) {
  switch (def.kind) {
    case 'bool': return { value: Boolean(v), type: 'bool' };
    case 'coverState': return { value: COVER_TO_DP[v] ?? 1, type: 'enum' };
    case 'enum': {
      const hit = Object.entries(def.map || {}).find(([, id]) => id === v);
      if (!hit) { throw new Error(`enum_value_not_mapped:${v}`); }
      return { value: Number(hit[0]), type: 'enum' };
    }
    case 'coverPos': {
      const n = Math.round(Math.max(0, Math.min(1, Number(v))) * 100);
      return { value: def.invert ? 100 - n : n, type: 'value' };
    }
    default: return { value: Math.round(Number(v) * (def.divisor || 1)), type: def.type || 'value' };
  }
}

// P3068: 'levels' — the device only accepts a fixed list of raw levels (def.levels, ascending). The capability is
// 0-1: level i of n reads as i/n (a raw value between two levels reads as the next one up) and a capability value
// is sent as the level whose band contains it.
function decodeLevels(def, raw) {
  const n = Number(toScalar(raw));
  if (!Number.isFinite(n) || !Array.isArray(def.levels) || !def.levels.length) { return null; }
  const i = def.levels.findIndex((l) => n <= l);
  return (i < 0 ? def.levels.length : i + 1) / def.levels.length;
}

function encodeLevels(def, v) {
  const len = Array.isArray(def.levels) ? def.levels.length : 0;
  if (!len) { throw new Error('levels_not_defined'); }
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  const i = Math.max(1, Math.min(len, Math.ceil((x * len) - 1e-9)));
  return { value: def.levels[i - 1], type: def.type || 'value' };
}

const EXTRA = { levels: { decode: decodeLevels, encode: encodeLevels } };

function decode(def, raw) {
  const x = EXTRA[def.kind];
  return x ? x.decode(def, raw) : decodeBuiltin(def, raw);
}

function encode(def, v) {
  const x = EXTRA[def.kind];
  return x ? x.encode(def, v) : encodeBuiltin(def, v);
}

module.exports = { decode, encode };
