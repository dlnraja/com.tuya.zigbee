'use strict';

function parseBoolean(value) {
  if (typeof value === 'boolean') {return value;}
  if (typeof value === 'number') {return value !== 0;}
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'on', 'yes', 'y', 'open', 'enabled'].includes(normalized)) {return true;}
  if (['false', '0', 'off', 'no', 'n', 'closed', 'disabled'].includes(normalized)) {return false;}
  throw new Error(`Invalid boolean DP value: ${value}`);
}

function parseDPValue(value, type = 'string') {
  const selectedType = String(type || 'string').toLowerCase();

  if (selectedType === 'bool' || selectedType === 'boolean') {
    return parseBoolean(value);
  }

  if (selectedType === 'number' || selectedType === 'value') {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(`Invalid numeric DP value: ${value}`);
    }
    return number;
  }

  // v10.7.0: full Tuya DP type coverage (was bool/number/json/string only)
  if (selectedType === 'enum') {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      // Some firmwares send the enum LABEL instead of the index — keep it
      return String(value);
    }
    return n;
  }

  if (selectedType === 'bitmap') {
    // bitmap 1/2/4 bytes → array of active bit indexes (ZHA parity)
    let num = 0;
    if (Buffer.isBuffer(value)) {
      for (let b = 0; b < Math.min(value.length, 4); b++) {num |= value[b] << (8 * b);}
    } else {
      num = Number(value) || 0;
    }
    const bits = [];
    for (let i = 0; i < 32; i++) {if (num & (1 << i)) {bits.push(i);}}
    return bits;
  }

  if (selectedType === 'raw') {
    if (Buffer.isBuffer(value)) {return value;}
    if (Array.isArray(value)) {return Buffer.from(value);}
    if (typeof value === 'string') {
      // base64 (cloud API) or hex string
      if (/^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0) {return Buffer.from(value, 'hex');}
      return Buffer.from(value, 'base64');
    }
    return Buffer.from([Number(value) & 0xFF]);
  }

  if (selectedType === 'json') {
    try {
      return JSON.parse(String(value));
    } catch (err) {
      throw new Error(`Invalid JSON DP value: ${err.message}`);
    }
  }

  return value === undefined || value === null ? '' : String(value);
}

function stringifyDPValue(value) {
  if (value === undefined) {return '';}
  if (typeof value === 'string') {return value;}
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return String(value);
  }
}

/**
 * P2703 (forum 154077 #473, Andi): a Tuya spec range is written in RAW units plus `scale`
 * (number of decimals). pir_delay {min:50,max:36000,scale:1} means 5.0–3600.0 s.
 * @param {{min?:number,max?:number,step?:number,scale?:number}} spec
 * @returns {{min:number|null,max:number|null,step:number|null,factor:number}}
 */
function specRangeToReal(spec = {}) {
  const scale = Math.max(0, Math.min(9, Math.floor(Number(spec.scale) || 0)));
  const factor = 10 ** scale;
  const conv = (v) => (Number.isFinite(Number(v)) ? Number(v) / factor : null);
  return { min: conv(spec.min), max: conv(spec.max), step: conv(spec.step), factor };
}

/** Real value → raw integer for a SET, clamped to the spec range. */
function realToSpecRaw(value, spec = {}) {
  const { factor } = specRangeToReal(spec);
  let raw = Math.round(Number(value) * factor);
  if (!Number.isFinite(raw)) return null;
  if (Number.isFinite(Number(spec.min))) raw = Math.max(Number(spec.min), raw);
  if (Number.isFinite(Number(spec.max))) raw = Math.min(Number(spec.max), raw);
  return raw;
}

module.exports = {
  specRangeToReal,
  realToSpecRaw,
  parseDPValue,
  stringifyDPValue,
};
