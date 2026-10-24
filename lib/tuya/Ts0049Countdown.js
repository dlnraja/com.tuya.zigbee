'use strict';

/**
 * P3019: Haozee HZ-WT02 water valve (TS0049 `_TZ3000_kz1anoi8`) — watering countdown through the
 * Tuya private cluster 0xE001, command 0xFE (setCountdown). Method M10 (manufacturer-specific write).
 *
 * Source (facts only, rewritten, credited in CREDITS.md): Koenkk/zigbee-herdsman-converters
 * src/devices/tuya.ts, model "HZ-WT02": custom cluster manuSpecificTuyaE001 (0xE001) with command
 * setCountdown ID 0xFE, payload = 0x0B followed by the duration in seconds as uint32 big-endian
 * (tzLocal.ts0049_countdown, 1..1440 minutes); the device answers on 0xE001 with command 0x0A,
 * byte 7 = 0x0B, bytes 8..11 = seconds BE (fzLocal.ts0049_countdown).
 *
 * WHY opt-in: nothing is sent at pairing or init. The frame leaves only when the user sets a
 * countdown, and only for this exact couple.
 */

const CLUSTER = 0xE001;
const CMD_SET_COUNTDOWN = 0xFE;
const CMD_REPORT = 0x0A;
const MARKER = 0x0B;
const MIN_MIN = 1;
const MAX_MIN = 1440;

function isTs0049Couple(manufacturerName, productId) {
  return String(manufacturerName || '').trim().toLowerCase() === '_tz3000_kz1anoi8'
    && String(productId || '').trim().toUpperCase() === 'TS0049';
}

/** Payload of setCountdown: [0x0B, u32be seconds]. Returns null when out of range. */
function buildPayload(minutes) {
  const m = Number(minutes);
  if (!Number.isInteger(m) || m < MIN_MIN || m > MAX_MIN) { return null; }
  const b = Buffer.alloc(5);
  b[0] = MARKER;
  b.writeUInt32BE(m * 60, 1);
  return b;
}

/** Full ZCL frame: cluster-specific, client→server, no manufacturer code. */
function buildFrame(minutes, tsn = 1) {
  const p = buildPayload(minutes);
  if (!p) { return null; }
  return Buffer.concat([Buffer.from([0x01, Number(tsn) & 0xFF, CMD_SET_COUNTDOWN]), p]);
}

/** Decode a raw 0xE001 frame from the device; returns minutes or null. */
function parseReport(raw) {
  let d = null;
  if (Buffer.isBuffer(raw)) { d = raw; } else if (Array.isArray(raw)) { d = Buffer.from(raw); }
  if (!d || d.length <= 10 || d[2] !== CMD_REPORT || d[7] !== MARKER || (d[6] !== 0x05 && d[6] !== 0x06)) { return null; }
  return d.readUInt32BE(8) / 60;
}

/** Send through the Homey node (endpoint 1). Resolves { ok, reason }. Never throws. */
async function sendCountdown(device, minutes) {
  try {
    device._ts0049Tsn = ((device._ts0049Tsn || 0) + 1) & 0xFF;
    const frame = buildFrame(minutes, device._ts0049Tsn);
    if (!frame) { return { ok: false, reason: 'out_of_range' }; }
    const node = device.node || device.zclNode?.node;
    if (!node || typeof node.sendFrame !== 'function') { return { ok: false, reason: 'no_node' }; }
    await node.sendFrame(1, CLUSTER, frame);
    return { ok: true, frame: frame.toString('hex') };
  } catch (err) {
    return { ok: false, reason: err && err.message };
  }
}

const SOURCE = 'z2m:zigbee-herdsman-converters tuya.ts HZ-WT02 (TS0049 _TZ3000_kz1anoi8) manuSpecificTuyaE001 setCountdown 0xFE';

module.exports = { CLUSTER, CMD_SET_COUNTDOWN, MIN_MIN, MAX_MIN, SOURCE, isTs0049Couple, buildPayload, buildFrame, parseReport, sendCountdown };
