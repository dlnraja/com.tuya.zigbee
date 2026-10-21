'use strict';

/**
 * P2934 — Optional Aqara DJT11LM (LUMI / lumi.vibration.aq1) overlay.
 *
 * The sensor reports vibration events as manufacturer-specific attributes on
 * the native Closures/Door-Lock cluster (0x0101) that the SDK does not name:
 *   0x0055 (85)   event: 1 = vibration, 2 = tilt, 3 = drop
 *   0x0503 (1283) tilt angle (degrees)
 *   0x0505 (1285) strength (upper 16 bits relevant)
 * Written in our own words after the zigbee-herdsman-converters `lumi_vibration_analog`
 * converter (Koenkk/zigbee-herdsman-converters, src/lib/lumi.ts) and the ZHA
 * xiaomi vibration quirk. Purely additive: native IAS/Tuya paths keep working,
 * this only arms for LUMI manufacturer names and never throws.
 */

const EVENTS = { 1: 'vibration', 2: 'tilt', 3: 'drop' };
const TYPE_SIZE = { 0x10: 1, 0x18: 1, 0x20: 1, 0x28: 1, 0x30: 1, 0x19: 2, 0x21: 2, 0x29: 2, 0x31: 2, 0x22: 3, 0x2a: 3, 0x1b: 4, 0x23: 4, 0x2b: 4, 0x39: 4 };

function readValue(buf, off, type) {
  const n = TYPE_SIZE[type];
  if (!n || off + n > buf.length) { return { ok: false }; }
  let v;
  if (n === 1) { v = type === 0x28 ? buf.readInt8(off) : buf[off]; }
  else if (n === 2) { v = type === 0x29 ? buf.readInt16LE(off) : buf.readUInt16LE(off); }
  else if (n === 3) { v = buf.readUIntLE(off, 3); }
  else { v = type === 0x2b ? buf.readInt32LE(off) : type === 0x39 ? buf.readFloatLE(off) : buf.readUInt32LE(off); }
  return { ok: true, v, n };
}

/** Decode a raw ZCL frame for cluster 0x0101; returns {} when nothing relevant. */
function decodeLumiVibrationFrame(raw) {
  const out = {};
  if (!raw || raw.length < 3) { return out; }
  const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  const { parseZclHeader } = require('../zigbee/ZigbeeHelpers');
  const hdr = parseZclHeader(buf);
  if (!hdr || hdr.clusterSpecific) { return out; }
  const isReport = hdr.cmdId === 0x0a;
  const isRead = hdr.cmdId === 0x01;
  if (!isReport && !isRead) { return out; }
  let off = hdr.payloadOffset;
  while (off + 3 <= buf.length) {
    const attr = buf.readUInt16LE(off); off += 2;
    if (isRead) { const status = buf[off++]; if (status !== 0) { continue; } }
    const type = buf[off++];
    const r = readValue(buf, off, type);
    if (!r.ok) { break; }
    off += r.n;
    if (attr === 0x0055 && EVENTS[r.v]) { out.action = EVENTS[r.v]; }
    else if (attr === 0x0503) { out.angle = r.v; }
    else if (attr === 0x0505) { out.strength = r.v >>> 16 || (r.v >> 8); }
  }
  return out;
}

function isLumi(device) {
  try {
    const mfr = String(device.getSetting?.('zb_manufacturer_name') || device.getData?.()?.manufacturerName || '');
    return /^lumi/i.test(mfr);
  } catch (e) { return false; }
}

/** Arm the overlay on a device; returns true when armed. Never throws. */
function attachLumiVibrationOverlay(device, zclNode) {
  try {
    const node = zclNode || device.zclNode;
    if (!node || typeof node.handleFrame !== 'function' || !isLumi(device)) { return false; }
    const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
    wrapHandleFrame(node, 'lumi-vibration-p2934', async (args, next) => {
      try {
        const [, clusterId, frame] = args;
        if (Number(clusterId) === 0x0101) {
          const json = typeof frame?.toJSON === 'function' ? frame.toJSON() : frame;
          const data = Buffer.isBuffer(json?.data) ? json.data : Array.isArray(json?.data) ? Buffer.from(json.data) : Buffer.isBuffer(frame) ? frame : null;
          const ev = data ? decodeLumiVibrationFrame(data) : {};
          if (ev.action) {
            device.log?.(`[LUMI-VIB] event=${ev.action}${ev.angle != null ? ` angle=${ev.angle}` : ''}`);
            if (ev.action === 'vibration' && device.hasCapability?.('alarm_vibration')) {
              device.safeSetCapabilityValue?.('alarm_vibration', true)?.catch?.(() => {});
              const secs = Number(device.getSetting?.('vibration_auto_reset')) || 90;
              const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');
              if (device._lumiVibTimer) { safeClearTimeout(device, device._lumiVibTimer); }
              device._lumiVibTimer = safeSetTimeout(device, () => {
                if (!device._destroyed) { device.safeSetCapabilityValue?.('alarm_vibration', false)?.catch?.(() => {}); }
              }, secs * 1000);
                          } else if ((ev.action === 'tilt' || ev.action === 'drop') && device.hasCapability?.('alarm_tamper')) {
              device.safeSetCapabilityValue?.('alarm_tamper', true)?.catch?.(() => {});
            }
          }
        }
      } catch (e) { /* overlay is optional */ }
      return next();
    });
    return true;
  } catch (e) { return false; }
}

module.exports = { decodeLumiVibrationFrame, attachLumiVibrationOverlay, EVENTS };
