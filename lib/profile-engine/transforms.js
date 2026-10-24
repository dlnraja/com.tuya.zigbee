'use strict';
/**
 * P-KB2 profile engine — value transforms (own implementation).
 * Patterns inspired by zigbee-herdsman-converters value converters (Koenkk, MIT), deCONZ DDF "eval"/parse
 * functions (dresden-elektronik, BSD-3) and tuya-local dp "mapping" (make-all, MIT). No code copied.
 */
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function round(v, precision) { if (precision == null) {return v;} const f = 10 ** precision; return Math.round(v * f) / f; }
/** Apply one declarative step to a raw value. Unknown steps are ignored (never throw). */
function step(v, s) {
  if (v == null || !s || typeof s !== 'object') {return v;}
  switch (s.op) {
    case 'scale': { const n = num(v); return n == null ? v : n * (s.factor ?? 1); }
    case 'divide': { const n = num(v); return n == null || !s.by ? v : n / s.by; }
    case 'offset': { const n = num(v); return n == null ? v : n + (s.by ?? 0); }
    case 'clamp': { const n = num(v); return n == null ? v : Math.min(s.max ?? Infinity, Math.max(s.min ?? -Infinity, n)); }
    case 'round': { const n = num(v); return n == null ? v : round(n, s.precision ?? 0); }
    case 'enum': { const k = String(v); return s.map && Object.prototype.hasOwnProperty.call(s.map, k) ? s.map[k] : s.default ?? v; }
    case 'bool': return s.invert ? !v : !!v;
    case 'bitmap': { const n = num(v); if (n == null) {return v;} const o = {}; for (const [bit, name] of Object.entries(s.bits || {})) {o[name] = !!(n & (1 << Number(bit)));} return o; }
    case 'struct': { // raw DP buffer -> named fields (big-endian)
      const b = Buffer.isBuffer(v) ? v : Array.isArray(v) ? Buffer.from(v) : null; if (!b) {return v;} const o = {};
      for (const f of s.fields || []) { if (f.offset + (f.len || 1) > b.length) {continue;}
        o[f.name] = f.len === 4 ? b.readUInt32BE(f.offset) : f.len === 2 ? b.readUInt16BE(f.offset) : b.readUInt8(f.offset); }
      return o; }
    case 'pick': return v && typeof v === 'object' ? v[s.field] : v;
    default: return v;
  }
}
function apply(v, steps) { let out = v; for (const s of steps || []) { try { out = step(out, s); } catch { /* keep previous */ } } return out; }
/** Inverse for writes (scale/divide/offset/enum/bool only). */
function invert(v, steps) {
  let out = v;
  for (const s of [...steps || []].reverse()) {
    if (s.op === 'scale' && s.factor) {out = out / s.factor;}
    else if (s.op === 'divide' && s.by) {out = out * s.by;}
    else if (s.op === 'offset') {out = out - (s.by ?? 0);}
    else if (s.op === 'enum') { const e = Object.entries(s.map || {}).find(([, x]) => x === out); if (e) {out = isNaN(+e[0]) ? e[0] : +e[0];} }
    else if (s.op === 'bool') {out = s.invert ? !out : !!out;}
  }
  return out;
}
/** User calibration + precision (Z2M-style <attr>_calibration / <attr>_precision), applied after the profile. */
function calibrate(v, { offset = 0, percent = 0, precision = null } = {}) {
  const n = num(v); if (n == null) {return v;} let o = n + offset; if (percent) {o += (o * percent) / 100;} return round(o, precision);
}
module.exports = { step, apply, invert, calibrate, round };
