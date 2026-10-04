'use strict';

// Pure value codec for TuyaDpProfileDevice profiles (kept free of Homey imports so it is testable).
const COVER_TO_DP = { up: 0, idle: 1, down: 2 };
const COVER_FROM_DP = { 0: 'up', 1: 'idle', 2: 'down' };

function toScalar(raw) {
  if (Buffer.isBuffer(raw)) { return raw.length ? raw.readUIntBE(0, Math.min(raw.length, 6)) : null; }
  return raw === undefined ? null : raw;
}

function decode(def, raw) {
  const v = toScalar(raw);
  if (v === null) { return null; }
  switch (def.kind) {
    case 'bool': return v === true || v === 1 || v === '1';
    case 'presence': return Number(v) === 1;
    case 'coverState': return COVER_FROM_DP[Number(v)] ?? null;
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

function encode(def, v) {
  switch (def.kind) {
    case 'bool': return { value: Boolean(v), type: 'bool' };
    case 'coverState': return { value: COVER_TO_DP[v] ?? 1, type: 'enum' };
    case 'coverPos': {
      const n = Math.round(Math.max(0, Math.min(1, Number(v))) * 100);
      return { value: def.invert ? 100 - n : n, type: 'value' };
    }
    default: return { value: Math.round(Number(v) * (def.divisor || 1)), type: def.type || 'value' };
  }
}

module.exports = { decode, encode };
