'use strict';

/** Unwrap a Tuya cluster event or a "hex:01" payload used in Homey diagnostic logs. */
function tuyaDpPayload(value) {
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    if (Object.prototype.hasOwnProperty.call(value, 'value') && value.value != null) {
      return value.value;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'data') && value.data != null) {
      return value.data;
    }
  }
  return value;
}

function fromHexTag(text) {
  const match = /^hex:([0-9a-f]+)$/i.exec(String(text).trim());
  if (!match) {
    return null;
  }
  try {
    return Buffer.from(match[1], 'hex');
  } catch (_e) {
    return null;
  }
}

/** True, false, or null when the report is not a Tuya bool. Null must not be stored as false. */
function tuyaDpBool(value) {
  let raw = tuyaDpPayload(value);
  if (typeof raw === 'string') {
    const asHex = fromHexTag(raw);
    if (asHex) {
      raw = asHex;
    }
  }
  if (raw === true || raw === 1) {
    return true;
  }
  if (raw === false || raw === 0) {
    return false;
  }
  if (typeof raw === 'string') {
    const text = raw.trim().toLowerCase();
    if (text === '1' || text === 'true' || text === 'on' || text === 'open') {
      return true;
    }
    if (text === '0' || text === 'false' || text === 'off' || text === 'closed') {
      return false;
    }
    return null;
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw) && raw.length === 1) {
    if (raw[0] === 1) {
      return true;
    }
    if (raw[0] === 0) {
      return false;
    }
  }
  return null;
}

module.exports = { tuyaDpBool, tuyaDpPayload, fromHexTag };
