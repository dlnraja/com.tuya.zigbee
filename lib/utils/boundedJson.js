'use strict';
/**
 * P3068: bounded JSON for logs in frame / DP / attribute handlers.
 * JSON.stringify(frame) in a hot handler builds one large string per incoming frame (a Buffer becomes
 * {"type":"Buffer","data":[…]} ≈ 4 chars per byte; pretty-printed even more) and Homey keeps recent log
 * lines in its ring buffer — on a 64 MB heap that adds up under DP floods.
 * boundedJson(v) never throws (cycles, BigInt), prints Buffers as short hex and caps the result.
 */
const DEFAULT_MAX = 240;
const BUF_HEX_BYTES = 32;

function bufLabel(b) {
  const head = b.subarray(0, BUF_HEX_BYTES).toString('hex');
  return `<buf ${b.length}B ${head}${b.length > BUF_HEX_BYTES ? '…' : ''}>`;
}

function boundedJson(value, max = DEFAULT_MAX) {
  const cap = Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX;
  if (Buffer.isBuffer(value)) { return bufLabel(value); }
  let s;
  try {
    s = JSON.stringify(value, function replacer(k, x) {
      const orig = this && k !== '' ? this[k] : value;
      if (Buffer.isBuffer(orig)) { return bufLabel(orig); }
      return typeof x === 'bigint' ? String(x) : x;
    });
  } catch (e) {
    s = `[unserializable: ${e && e.message ? String(e.message).slice(0, 60) : 'error'}]`;
  }
  if (s === undefined) { s = String(value); }
  return s.length > cap ? `${s.slice(0, cap)}…(+${s.length - cap})` : s;
}

module.exports = { boundedJson, DEFAULT_MAX };
