'use strict';

/**
 * P3384 / Tuya Local 154077 #475-#479 (Andi, Martin/MrMagu): some heat pumps
 * pack the setpoint inside a "parameter group" DP (DP 118 field 5, 1-based)
 * instead of publishing a standalone temperature DP. Generic decoder for a
 * packed int32 big-endian struct, with opt-in mapping. Writes always start
 * from the last block the device reported since connect, and change only the
 * chosen field.
 */

function toBuffer(raw) {
  if (raw == null) {return null;}
  if (Buffer.isBuffer(raw)) {return raw;}
  if (raw instanceof Uint8Array) {return Buffer.from(raw);}
  if (Array.isArray(raw)) {return Buffer.from(raw);}
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) {return null;}
    try {return Buffer.from(s, 'base64');} catch (_e) {return null;}
  }
  return null;
}

function decodeInt32Be(raw) {
  const buf = toBuffer(raw);
  if (!buf || buf.length < 4 || buf.length % 4 !== 0) {return null;}
  const fields = [];
  for (let i = 0; i < buf.length; i += 4) {
    fields.push(buf.readInt32BE(i));
  }
  return { encoding: 'int32be', fields, raw: Buffer.from(buf) };
}

/** Field index is 1-based, matching the Tuya Local "Target Temperature Field" setting. */
function getField(decoded, field1Based) {
  const n = Number(field1Based);
  if (!decoded || !Array.isArray(decoded.fields) || !Number.isInteger(n) || n < 1) {return null;}
  if (n > decoded.fields.length) {return null;}
  return decoded.fields[n - 1];
}

function setField(decoded, field1Based, value) {
  if (!decoded || !Buffer.isBuffer(decoded.raw)) {return null;}
  const n = Number(field1Based);
  const v = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > decoded.fields.length || !Number.isFinite(v)) {return null;}
  const raw = Buffer.from(decoded.raw);
  raw.writeInt32BE(Math.trunc(v), (n - 1) * 4);
  const fields = decoded.fields.slice();
  fields[n - 1] = Math.trunc(v);
  return { encoding: decoded.encoding, fields, raw };
}

function encodeBase64(decoded) {
  if (!decoded || !Buffer.isBuffer(decoded.raw)) {return null;}
  return decoded.raw.toString('base64');
}

/**
 * Remember the last reported packed block per DP so a write can mutate only
 * one field. Never invent a block if the device has not reported one yet.
 */
function rememberReport(store, dp, raw) {
  const decoded = decodeInt32Be(raw);
  if (!decoded) {return store || {};}
  const out = store && typeof store === 'object' ? store : {};
  out[String(dp)] = decoded;
  return out;
}

function buildWrite(store, dp, field1Based, value) {
  const prev = store && store[String(dp)];
  if (!prev) {return { ok: false, reason: 'no-reported-block' };}
  const next = setField(prev, field1Based, value);
  if (!next) {return { ok: false, reason: 'bad-field' };}
  return { ok: true, payload: encodeBase64(next), decoded: next };
}

module.exports = {
  toBuffer,
  decodeInt32Be,
  getField,
  setField,
  encodeBase64,
  rememberReport,
  buildWrite,
};
