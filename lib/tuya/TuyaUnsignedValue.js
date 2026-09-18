'use strict';

/**
 * TuyaUnsignedValue — harden Tuya VALUE (type 2) as unsigned 32-bit
 *
 * WHY(P2580 / Z2M#32561 MTG275 detection_range): some MCU reports / host stacks
 * surface VALUE as signed int32. Dividing signed garbage → absurd meters
 * (e.g. set 2.2 → published -6039797.68).
 *
 * Contre quoi: signed reinterpretation of detection_range / distance DPs.
 */

/**
 * Coerce a Tuya VALUE raw into unsigned 32-bit integer domain.
 * @param {unknown} raw
 * @returns {number|null}
 */
function asUnsignedTuyaValue(raw) {
  if (raw == null) return null;
  if (typeof raw === 'bigint') {
    const n = Number(raw & 0xffffffffn);
    return Number.isFinite(n) ? n : null;
  }
  if (Buffer.isBuffer(raw)) {
    if (raw.length >= 4) return raw.readUInt32BE(0);
    if (raw.length >= 2) return raw.readUInt16BE(0);
    return raw.length ? raw[0] : null;
  }
  if (typeof raw === 'object') {
    raw = raw.value ?? raw.data ?? raw.v ?? null;
  }
  let n = Number(raw);
  if (!Number.isFinite(n)) return null;
  // JS Number may already be float meters — callers pass raw MCU ints
  if (n < 0) {
    // signed int32 → uint32
    n = n >>> 0;
  }
  // Clamp to uint32
  if (n > 0xffffffff) n = n >>> 0;
  return Math.floor(n);
}

/**
 * Encode meters (or other unit) × divisor for TX — never float, never signed.
 * @param {number} human — e.g. 2.5 meters
 * @param {number} [divisor=100]
 * @param {{ min?: number, max?: number }} [opts]
 */
function toTuyaScaledUint(human, divisor = 100, opts = {}) {
  const d = Number(divisor) > 0 ? Number(divisor) : 100;
  let v = Math.round(Number(human) * d);
  if (!Number.isFinite(v)) return null;
  if (v < 0) v = 0;
  const min = opts.min != null ? opts.min : 0;
  const max = opts.max != null ? opts.max : 0xffffffff;
  if (v < min) v = min;
  if (v > max) v = max;
  return v >>> 0;
}

module.exports = {
  asUnsignedTuyaValue,
  toTuyaScaledUint,
};
