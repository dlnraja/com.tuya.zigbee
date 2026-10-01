'use strict';

/**
 * P2769 — Tuya DP type VALUE (0x02) decoding.
 * The Tuya serial/Zigbee protocol defines VALUE as a 4-byte big-endian SIGNED
 * integer. Reading it as unsigned turns -2.2 °C (raw -22) into 4294967274.
 * Only the first 4 bytes are read (compound frames may carry trailing sub-DPs).
 * Lead: docs/automation/leads-other-apps.md "Signed values".
 */
function decodeTuyaValue(data) {
  if (!Buffer.isBuffer(data)) {return data;}
  if (data.length >= 4) {return data.readInt32BE(0);}
  if (data.length === 2) {return data.readUInt16BE(0);}
  if (data.length === 1) {return data.readUInt8(0);}
  let value = 0;
  for (let i = 0; i < data.length; i++) {value = (value << 8) + data[i];}
  return value;
}

/** Re-interpret an already-decoded unsigned 32-bit number as signed (idempotent for negatives). */
function toSigned32(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {return n;}
  if (n >= 0x80000000 && n <= 0xFFFFFFFF) {return n - 0x100000000;}
  return n;
}

module.exports = { decodeTuyaValue, toSigned32 };
