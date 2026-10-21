'use strict';

/**
 * P2932 — Tuya EF00 MCU OTA frames (observation only).
 *
 * Tuya Zigbee devices with an MCU behind the radio can run an OTA of the MCU
 * firmware over the private 0xEF00 cluster. The frame layouts below follow
 * the Koenkk/zigbee-herdsman cluster definition (src/zspec/zcl/definition/
 * cluster.ts, manuSpecificTuya): gateway->device 0x12 mcuOtaNotify and
 * 0x14 mcuOtaBlockDataResponse; device->gateway 0x13 mcuOtaBlockDataRequest
 * and 0x15 mcuOtaResult. Own implementation, field order taken from that
 * definition (credit: Koenkk and the zigbee-herdsman contributors).
 *
 * WHY: those device->gateway frames used to fall into the "unknown command"
 * path of TuyaBoundCluster, which parses any payload as DP records, so an OTA
 * block request could surface as phantom DP values. They are now recognised
 * and never handed to the DP parser. The app does not serve MCU images: no
 * public Tuya MCU image index exists, and Homey's native Device Updates only
 * covers the standard Zigbee OTA cluster 0x0019.
 */

const MCU_OTA_COMMANDS = Object.freeze({
  0x12: 'mcuOtaNotify',
  0x13: 'mcuOtaBlockDataRequest',
  0x14: 'mcuOtaBlockDataResponse',
  0x15: 'mcuOtaResult',
});

/** Commands a device sends to the gateway during an MCU OTA. */
const DEVICE_TO_GATEWAY = new Set([0x13, 0x15]);

function isMcuOtaCommand(cmdId) {
  return Object.prototype.hasOwnProperty.call(MCU_OTA_COMMANDS, cmdId);
}

function toBuffer(p) {
  if (Buffer.isBuffer(p)) return p;
  if (p && Buffer.isBuffer(p.data)) return p.data;
  if (p && Array.isArray(p.data)) return Buffer.from(p.data);
  if (Array.isArray(p)) return Buffer.from(p);
  return null;
}

/**
 * Parse a device->gateway MCU OTA frame. Big-endian fields as on the Tuya
 * cluster. Returns null when the payload is too short (never throws).
 */
function parseMcuOtaFrame(cmdId, payload) {
  const b = toBuffer(payload);
  if (!b) return null;
  try {
    if (cmdId === 0x13) {
      if (b.length < 16) return null;
      return {
        command: 'mcuOtaBlockDataRequest', seq: b.readUInt16BE(0),
        key: b.subarray(2, 10).toString('hex'), version: b.readUInt8(10),
        offset: b.readUInt32BE(11), size: b.readUInt8(15),
      };
    }
    if (cmdId === 0x15) {
      if (b.length < 12) return null;
      return {
        command: 'mcuOtaResult', seq: b.readUInt16BE(0), status: b.readUInt8(2),
        key: b.subarray(3, 11).toString('hex'), version: b.readUInt8(11),
      };
    }
  } catch { /* malformed */ }
  return null;
}

module.exports = { MCU_OTA_COMMANDS, DEVICE_TO_GATEWAY, isMcuOtaCommand, parseMcuOtaFrame };
